import { supabase } from './supabase'
import { devicesService, rentalsService } from './supabase-service'
import { emailService } from './email-service'
import type { Notification } from './supabase-types'

export const notificationsService = {
  async generateNotifications() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

    const notifications: Omit<Notification, 'id' | 'created_at'>[] = []

    // Check devices with subscriptions due in 7 days
    const { data: devices } = await devicesService.getAll()
    if (devices) {
      // Get admin email from settings
      const { data: settings } = await supabase
        .from('system_settings')
        .select('email')
        .limit(1)
        .single()
      
      for (const device of devices) {
        if (device.device_type?.has_subscription && device.subscription_date) {
          const subscriptionDate = new Date(device.subscription_date)
          subscriptionDate.setHours(0, 0, 0, 0)
          
          // Check if subscription is due in 7 days
          if (subscriptionDate.getTime() === sevenDaysFromNow.getTime()) {
            notifications.push({
              type: 'subscription_due',
              reference_id: device.id,
              message: `Subscription for ${device.name} is due in 7 days (${device.subscription_date})`,
              is_read: false,
            })
            
            // Send email to admin
            if (settings?.email && device.device_type?.subscription_cost) {
              try {
                await emailService.sendSubscriptionDue(
                  device.id,
                  settings.email,
                  {
                    device_name: device.name,
                    subscription_date: device.subscription_date,
                    subscription_cost: device.device_type.subscription_cost,
                  }
                )
              } catch (error) {
                console.error('Error sending subscription due email:', error)
              }
            }
          }
        }
      }
    }

    // Check rentals due to be returned in 7 days
    const { data: rentals } = await rentalsService.getAll()
    if (rentals) {
      const now = new Date()
      // Round to start of day for 7-day comparison (compare dates, not exact times)
      const sevenDaysFromNowForRentals = new Date(sevenDaysFromNow)
      
      for (const rental of rentals) {
        if (!rental.returned_date) {
          const endDate = new Date(rental.end_date)
          const endDateStartOfDay = new Date(endDate)
          endDateStartOfDay.setHours(0, 0, 0, 0)
          
          // Check if rental is due in 7 days (compare dates, not exact times)
          if (endDateStartOfDay.getTime() === sevenDaysFromNowForRentals.getTime()) {
            notifications.push({
              type: 'rental_due',
              reference_id: rental.id,
              message: `Rental for ${rental.device?.name ?? 'device'} is due to be returned in 7 days (${rental.end_date})`,
              is_read: false,
            })
            
            // Send email reminder to customer
            if (rental.user?.email) {
              try {
                await emailService.sendDueReturnReminder(rental.id, rental.user.email, 7)
              } catch (error) {
                console.error('Error sending due return email:', error)
              }
            }
          }
          
          // Check if rental is overdue (compare with current time)
          if (endDate < now) {
            notifications.push({
              type: 'rental_overdue',
              reference_id: rental.id,
              message: `Rental for ${rental.device?.name ?? 'device'} is overdue (was due ${rental.end_date})`,
              is_read: false,
            })
            
            // Send overdue email to customer and admin
            if (rental.user?.email) {
              try {
                const { data: settings } = await supabase
                  .from('system_settings')
                  .select('email')
                  .limit(1)
                  .single()
                
                await emailService.sendOverdueRental(
                  rental.id,
                  rental.user.email,
                  settings?.email
                )
              } catch (error) {
                console.error('Error sending overdue rental email:', error)
              }
            }
          }
          
          // Check if rental is due tomorrow (1 day)
          const oneDayFromNow = new Date(today)
          oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)
          if (endDateStartOfDay.getTime() === oneDayFromNow.getTime()) {
            // Send email reminder to customer
            if (rental.user?.email) {
              try {
                await emailService.sendDueReturnReminder(rental.id, rental.user.email, 1)
              } catch (error) {
                console.error('Error sending due return email:', error)
              }
            }
          }
        }

        // Check if rental needs to be shipped
        if (rental.delivery_method === 'shipping' && !rental.shipped_date) {
          notifications.push({
            type: 'rental_pending_shipment',
            reference_id: rental.id,
            message: `Rental for ${rental.device?.name ?? 'device'} needs to be shipped to customer`,
            is_read: false,
          })
        }
      }
    }

    // Insert notifications (avoid duplicates by checking existing)
    if (notifications.length > 0) {
      const { data: existingNotifications } = await supabase
        .from('notifications')
        .select('reference_id, type, is_read')
        .eq('is_read', false)
        .gte('created_at', today.toISOString())

      const existingKeys = new Set(
        (existingNotifications ?? []).map(n => `${n.type}-${n.reference_id}`)
      )

      const newNotifications = notifications.filter(
        n => !existingKeys.has(`${n.type}-${n.reference_id}`)
      )

      if (newNotifications.length > 0) {
        await supabase.from('notifications').insert(newNotifications)
      }
    }

    return { count: notifications.length }
  },

  async getNotifications(limit = 50) {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return { data, error }
  },

  async getUnreadNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('is_read', false)
      .order('created_at', { ascending: false })
    return { data, error }
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
    return { count: count ?? 0, error }
  },

  async markAsRead(notificationId: string) {
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .select()
      .single()
    return { data, error }
  },

  async markAllAsRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('is_read', false)
    return { error }
  },
}

