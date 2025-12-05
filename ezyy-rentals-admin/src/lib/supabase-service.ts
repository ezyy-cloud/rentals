import { supabase } from './supabase'
import type { User, DeviceType, Device, Accessory, Rental, RentalAccessory, SubscriptionPayment } from './supabase-types'

// Users
export const usersService = {
  async getAll() {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    return { data, error }
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
    return { data, error }
  },
  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('users').insert(user).select().single()
    return { data, error }
  },
  async update(id: string, user: Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('users')
      .update({ ...user, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('users').delete().eq('id', id)
    return { error }
  },
}

// Device Types
export const deviceTypesService = {
  async getAll() {
    const { data, error } = await supabase.from('device_types').select('*').order('created_at', { ascending: false })
    return { data, error }
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('device_types').select('*').eq('id', id).single()
    return { data, error }
  },
  async create(deviceType: Omit<DeviceType, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase.from('device_types').insert(deviceType).select().single()
    return { data, error }
  },
  async update(id: string, deviceType: Partial<Omit<DeviceType, 'id' | 'created_at' | 'updated_at'>>) {
    const { data, error } = await supabase
      .from('device_types')
      .update({ ...deviceType, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('device_types').delete().eq('id', id)
    return { error }
  },
}

// Accessories
export const accessoriesService = {
  async getAll() {
    const { data: accessories, error } = await supabase
      .from('accessories')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error || !accessories) return { data: accessories, error }
    
    // Fetch device types for each accessory from junction table
    const accessoriesWithDeviceTypes = await Promise.all(
      accessories.map(async (accessory) => {
        const { data: junctionData } = await supabase
          .from('accessory_device_types')
          .select('device_type_id')
          .eq('accessory_id', accessory.id)
        
        const device_type_ids = junctionData?.map(j => j.device_type_id) || []
        return { ...accessory, device_type_ids }
      })
    )
    
    return { data: accessoriesWithDeviceTypes, error: null }
  },
  async getById(id: string) {
    const { data, error } = await supabase.from('accessories').select('*').eq('id', id).single()
    return { data, error }
  },
  async create(accessory: Omit<Accessory, 'id' | 'created_at' | 'updated_at' | 'device_type_ids'> & { device_type_ids?: string[] }) {
    const { device_type_ids, ...accessoryData } = accessory
    const { data, error } = await supabase.from('accessories').insert(accessoryData).select().single()
    
    if (error || !data) return { data, error }
    
    // Insert device type associations
    if (device_type_ids && device_type_ids.length > 0) {
      const junctionData = device_type_ids.map(device_type_id => ({
        accessory_id: data.id,
        device_type_id
      }))
      await supabase.from('accessory_device_types').insert(junctionData)
    }
    
    return { data: { ...data, device_type_ids: device_type_ids || [] }, error: null }
  },
  async update(id: string, accessory: Partial<Omit<Accessory, 'id' | 'created_at' | 'updated_at' | 'device_type_ids'>> & { device_type_ids?: string[] }) {
    const { device_type_ids, ...accessoryData } = accessory
    const { data, error } = await supabase
      .from('accessories')
      .update({ ...accessoryData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error || !data) return { data, error }
    
    // Update device type associations
    if (device_type_ids !== undefined) {
      // Delete existing associations
      await supabase.from('accessory_device_types').delete().eq('accessory_id', id)
      
      // Insert new associations
      if (device_type_ids.length > 0) {
        const junctionData = device_type_ids.map(device_type_id => ({
          accessory_id: id,
          device_type_id
        }))
        await supabase.from('accessory_device_types').insert(junctionData)
      }
    }
    
    // Fetch updated device type IDs
    const { data: junctionData } = await supabase
      .from('accessory_device_types')
      .select('device_type_id')
      .eq('accessory_id', id)
    
    const updatedDeviceTypeIds = junctionData?.map(j => j.device_type_id) || []
    
    return { data: { ...data, device_type_ids: updatedDeviceTypeIds }, error: null }
  },
  async delete(id: string) {
    const { error } = await supabase.from('accessories').delete().eq('id', id)
    return { error }
  },
}

// Devices
export const devicesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('devices')
      .select('*, device_type:device_types(*)')
      .order('created_at', { ascending: false })
    return { data, error }
  },
  async getById(id: string) {
    const { data, error } = await supabase
      .from('devices')
      .select('*, device_type:device_types(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },
  async create(device: Omit<Device, 'id' | 'created_at' | 'updated_at' | 'device_type'>) {
    const { data, error } = await supabase.from('devices').insert(device).select().single()
    return { data, error }
  },
  async update(id: string, device: Partial<Omit<Device, 'id' | 'created_at' | 'updated_at' | 'device_type'>>) {
    const { data, error } = await supabase
      .from('devices')
      .update({ ...device, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('devices').delete().eq('id', id)
    return { error }
  },
  async updateSubscriptionDates() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // Find devices with subscription_date in the past
    const { data: devices, error: fetchError } = await supabase
      .from('devices')
      .select('id, subscription_date')
      .not('subscription_date', 'is', null)
      .lt('subscription_date', today.toISOString().split('T')[0])
    
    if (fetchError || !devices || devices.length === 0) {
      return { updated: 0, error: fetchError }
    }
    
    // Update each device's subscription_date to next month
    let updated = 0
    for (const device of devices) {
      if (device.subscription_date) {
        const currentDate = new Date(device.subscription_date)
        const nextMonth = new Date(currentDate)
        nextMonth.setMonth(nextMonth.getMonth() + 1)
        
        const { error } = await supabase
          .from('devices')
          .update({ 
            subscription_date: nextMonth.toISOString().split('T')[0],
            updated_at: new Date().toISOString()
          })
          .eq('id', device.id)
        
        if (!error) updated++
      }
    }
    
    return { updated, error: null }
  },
}

// Rentals
export const rentalsService = {
  async getAll() {
    const { data: rentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('*, user:users(*), device:devices(*, device_type:device_types(*))')
      .order('created_at', { ascending: false })

    if (rentalsError || !rentals) return { data: rentals, error: rentalsError }

    // Fetch accessories for each rental
    const rentalsWithAccessories = await Promise.all(
      rentals.map(async (rental) => {
        const { data: accessories } = await supabase
          .from('rental_accessories')
          .select('*, accessory:accessories(*)')
          .eq('rental_id', rental.id)
        return { ...rental, accessories: accessories ?? [] }
      })
    )

    return { data: rentalsWithAccessories, error: null }
  },
  async getById(id: string) {
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('*, user:users(*), device:devices(*, device_type:device_types(*))')
      .eq('id', id)
      .single()

    if (rentalError) return { data: null, error: rentalError }

    const { data: accessories, error: accessoriesError } = await supabase
      .from('rental_accessories')
      .select('*, accessory:accessories(*)')
      .eq('rental_id', id)

    return {
      data: accessories ? { ...rental, accessories } : rental,
      error: accessoriesError,
    }
  },
  async create(rental: Omit<Rental, 'id' | 'created_at' | 'updated_at' | 'user' | 'device' | 'accessories'>, accessoryIds: { accessory_id: string; quantity: number }[] = []) {
    const { data: rentalData, error: rentalError } = await supabase
      .from('rentals')
      .insert(rental)
      .select()
      .single()

    if (rentalError || !rentalData) return { data: null, error: rentalError }

    if (accessoryIds.length > 0) {
      const rentalAccessories = accessoryIds.map((item) => ({
        rental_id: rentalData.id,
        accessory_id: item.accessory_id,
        quantity: item.quantity,
      }))

      const { error: accessoriesError } = await supabase.from('rental_accessories').insert(rentalAccessories)
      if (accessoriesError) return { data: rentalData, error: accessoriesError }
    }

    // Create notification if rental needs to be shipped
    if (rental.delivery_method === 'shipping' && !rental.shipped_date) {
      // Get device name for notification
      const { data: device } = await supabase
        .from('devices')
        .select('name')
        .eq('id', rental.device_id)
        .single()

      const deviceName = device?.name ?? 'device'
      const { error: notificationError } = await supabase.from('notifications').insert({
        type: 'rental_pending_shipment',
        reference_id: rentalData.id,
        message: `New rental for ${deviceName} needs to be shipped to customer`,
        is_read: false,
      })

      if (notificationError) {
        console.error('Error creating shipping notification:', notificationError)
      }
    }

    return { data: rentalData, error: null }
  },
  async update(id: string, rental: Partial<Omit<Rental, 'id' | 'created_at' | 'updated_at' | 'user' | 'device' | 'accessories'>>, accessoryIds: { accessory_id: string; quantity: number }[] = []) {
    const { data, error } = await supabase
      .from('rentals')
      .update({ ...rental, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) return { data, error }

    // Update accessories if provided
    if (accessoryIds.length >= 0) {
      // Delete existing accessories
      await supabase.from('rental_accessories').delete().eq('rental_id', id)

      // Insert new accessories
      if (accessoryIds.length > 0) {
        const rentalAccessories = accessoryIds.map((item) => ({
          rental_id: id,
          accessory_id: item.accessory_id,
          quantity: item.quantity,
        }))

        const { error: accessoriesError } = await supabase.from('rental_accessories').insert(rentalAccessories)
        if (accessoriesError) return { data, error: accessoriesError }
      }
    }

    return { data, error: null }
  },
  async delete(id: string) {
    const { error } = await supabase.from('rentals').delete().eq('id', id)
    return { error }
  },
  async markRentalAsReturned(rentalId: string, returnedDate?: string) {
    const date = returnedDate ?? new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('rentals')
      .update({ returned_date: date, updated_at: new Date().toISOString() })
      .eq('id', rentalId)
      .select()
      .single()
    return { data, error }
  },
  async markRentalAsShipped(rentalId: string, shippedDate?: string) {
    const date = shippedDate ?? new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('rentals')
      .update({ shipped_date: date, updated_at: new Date().toISOString() })
      .eq('id', rentalId)
      .select()
      .single()

    // Mark related pending shipment notifications as read when rental is shipped
    if (!error) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('type', 'rental_pending_shipment')
        .eq('reference_id', rentalId)
        .eq('is_read', false)
    }

    return { data, error }
  },
}

// Subscription Payments
export const subscriptionPaymentsService = {
  async getAll() {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*, device:devices(*, device_type:device_types(*))')
      .order('payment_date', { ascending: false })
    return { data, error }
  },
  async getByDeviceId(deviceId: string) {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('device_id', deviceId)
      .order('payment_date', { ascending: false })
    return { data, error }
  },
  async getById(id: string) {
    const { data, error } = await supabase
      .from('subscription_payments')
      .select('*, device:devices(*, device_type:device_types(*))')
      .eq('id', id)
      .single()
    return { data, error }
  },
  async create(payment: Omit<SubscriptionPayment, 'id' | 'created_at' | 'updated_at' | 'device'>) {
    const { data, error } = await supabase
      .from('subscription_payments')
      .insert(payment)
      .select()
      .single()
    return { data, error }
  },
  async update(id: string, payment: Partial<Omit<SubscriptionPayment, 'id' | 'created_at' | 'updated_at' | 'device'>>) {
    const { data, error } = await supabase
      .from('subscription_payments')
      .update({ ...payment, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    return { data, error }
  },
  async delete(id: string) {
    const { error } = await supabase.from('subscription_payments').delete().eq('id', id)
    return { error }
  },
}

