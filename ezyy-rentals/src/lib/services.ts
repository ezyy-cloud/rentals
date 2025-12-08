import { supabase } from './supabase'
import type { User, DeviceType, Device, Rental } from './types'

// Device Types
export const deviceTypesService = {
  async getAll() {
    const { data, error } = await supabase
      .from('device_types')
      .select('*')
      .order('name', { ascending: true })
    return { data, error }
  },
  async getById(id: string) {
    const { data, error } = await supabase
      .from('device_types')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },
}

// Devices - Get available devices (not currently rented, working, and subscription paid if applicable)
export const devicesService = {
  async getAvailable() {
    const now = new Date().toISOString()
    
    // Get all devices with their types, only working devices
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*, device_type:device_types(*)')
      .eq('working_state', 'Working')
      .order('created_at', { ascending: false })

    if (devicesError) {
      return { data: [], error: devicesError }
    }

    if (!devices || devices.length === 0) {
      return { data: [], error: null }
    }

    // Get all active rentals (not returned and end_date >= now)
    const { data: activeRentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('device_id')
      .is('returned_date', null)
      .gte('end_date', now)

    if (rentalsError) {
      // Don't fail completely if we can't get rentals, just show all devices
      return { data: devices, error: null }
    }

    const rentedDeviceIds = new Set(activeRentals?.map(r => r.device_id) ?? [])

    // Filter devices:
    // 1. Not currently rented
    // 2. If device has subscription, subscription_date must be >= today (subscription paid)
    const availableDevices = devices.filter((device) => {
      // Skip if device is rented
      if (rentedDeviceIds.has(device.id)) {
        return false
      }

      // Check subscription status
      const deviceType = device.device_type
      if (deviceType?.has_subscription) {
        // Device requires subscription - check if subscription is paid (subscription_date >= today)
        if (!device.subscription_date) {
          // No subscription date set, device is not available
          return false
        }
        
        const subscriptionDate = new Date(device.subscription_date)
        const todayDate = new Date()
        todayDate.setHours(0, 0, 0, 0)
        subscriptionDate.setHours(0, 0, 0, 0)
        
        // Subscription must be paid (subscription_date >= today)
        if (subscriptionDate < todayDate) {
          // Subscription is overdue, device is not available
          return false
        }
      }

      return true
    })

    return { data: availableDevices, error: null }
  },
  async getById(id: string) {
    const { data, error } = await supabase
      .from('devices')
      .select('*, device_type:device_types(*)')
      .eq('id', id)
      .single()
    return { data, error }
  },
  async getAvailableByType() {
    const now = new Date().toISOString()
    
    // Get ALL device types first (to include types with no devices yet)
    const { data: allDeviceTypes, error: deviceTypesError } = await supabase
      .from('device_types')
      .select('*')
      .order('name', { ascending: true })

    if (deviceTypesError) {
      return { data: [], error: deviceTypesError }
    }

    // Get ALL devices with their types (not just working ones - show full catalog)
    const { data: devices, error: devicesError } = await supabase
      .from('devices')
      .select('*, device_type:device_types(*)')
      .order('created_at', { ascending: false })

    if (devicesError) {
      return { data: [], error: devicesError }
    }

    // Get all active rentals (not returned and end_date >= now)
    const { data: activeRentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('device_id')
      .is('returned_date', null)
      .gte('end_date', now)

    if (rentalsError) {
      // Don't fail completely if we can't get rentals, just show all devices
      return { data: [], error: rentalsError }
    }

    const rentedDeviceIds = new Set(activeRentals?.map(r => r.device_id) ?? [])

    // Separate devices into available and unavailable
    // A device is available if:
    // 1. It's working (working_state === 'Working')
    // 2. Not currently rented
    // 3. If device has subscription, subscription_date must be >= today (subscription paid)
    const availableDevices: Device[] = []
    const unavailableDevices: Device[] = []
    
    if (devices) {
      for (const device of devices) {
        // Check if device is working
        if (device.working_state !== 'Working') {
          unavailableDevices.push(device)
          continue
        }

        // Check if device is rented
        if (rentedDeviceIds.has(device.id)) {
          unavailableDevices.push(device)
          continue
        }

        // Check subscription status
        const deviceType = device.device_type
        if (deviceType?.has_subscription) {
          // Device requires subscription - check if subscription is paid (subscription_date >= today)
          if (!device.subscription_date) {
            // No subscription date set, device is not available
            unavailableDevices.push(device)
            continue
          }
          
          const subscriptionDate = new Date(device.subscription_date)
          const todayDate = new Date()
          todayDate.setHours(0, 0, 0, 0)
          subscriptionDate.setHours(0, 0, 0, 0)
          
          // Subscription must be paid (subscription_date >= today)
          if (subscriptionDate < todayDate) {
            // Subscription is overdue, device is not available
            unavailableDevices.push(device)
            continue
          }
        }

        // Device is available
        availableDevices.push(device)
      }
    }

    // Group ALL devices by device_type_id (both available and unavailable)
    const grouped = new Map<string, { device_type: DeviceType; available: Device[]; unavailable: Device[] }>()
    
    // Initialize with all device types (including those with no devices)
    if (allDeviceTypes) {
      for (const deviceType of allDeviceTypes) {
        grouped.set(deviceType.id, {
          device_type: deviceType,
          available: [],
          unavailable: [],
        })
      }
    }
    
    // Group available devices
    for (const device of availableDevices) {
      if (!device.device_type) continue
      
      const typeId = device.device_type_id
      if (!grouped.has(typeId)) {
        grouped.set(typeId, {
          device_type: device.device_type,
          available: [],
          unavailable: [],
        })
      }
      grouped.get(typeId)!.available.push(device)
    }
    
    // Group unavailable devices
    for (const device of unavailableDevices) {
      if (!device.device_type) continue
      
      const typeId = device.device_type_id
      if (!grouped.has(typeId)) {
        grouped.set(typeId, {
          device_type: device.device_type,
          available: [],
          unavailable: [],
        })
      }
      grouped.get(typeId)!.unavailable.push(device)
    }

    // Convert to array format with counts
    // Only count available devices in available_count
    const result = Array.from(grouped.values()).map((group) => ({
      device_type: group.device_type,
      available_count: group.available.length, // Only count available devices
      total_count: group.available.length + group.unavailable.length, // Total in catalog
      sample_device: group.available[0] || group.unavailable[0] || undefined, // Prefer available device as sample, fallback to unavailable
    }))

    return { data: result, error: null }
  },
}

// Accessories
export const accessoriesService = {
  async getAll() {
    const { data: accessories, error } = await supabase
      .from('accessories')
      .select('*')
      .order('name', { ascending: true })
    
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
}

// Users
export const usersService = {
  async getByEmail(email: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    return { data, error }
  },
  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()
    return { data, error }
  },
  async create(user: Omit<User, 'id' | 'created_at' | 'updated_at'>) {
    // Try using the database function first (bypasses RLS)
    // This is safer during sign-up when session might not be fully established
    const { data: functionData, error: functionError } = await supabase.rpc('create_user_profile', {
      p_email: user.email,
      p_first_name: user.first_name,
      p_last_name: user.last_name,
      p_telephone: user.telephone,
      p_address: user.address,
      p_city: user.city,
      p_country: user.country,
      p_id_number: user.id_number,
      p_date_of_birth: user.date_of_birth,
      p_profile_picture: user.profile_picture,
      p_next_of_kin_first_name: user.next_of_kin_first_name,
      p_next_of_kin_last_name: user.next_of_kin_last_name,
      p_next_of_kin_phone_number: user.next_of_kin_phone_number,
    })

    if (!functionError && functionData) {
      // Function succeeded and returns the full user object (json)
      // This bypasses RLS read issues
      return { data: functionData as User, error: null }
    }

    // If function failed due to duplicate (user already exists), fetch the existing user
    if (functionError && (functionError.message?.includes('duplicate') || functionError.message?.includes('unique') || functionError.code === '23505')) {
      const { data: existingUser } = await this.getByEmail(user.email)
      if (existingUser) {
        return { data: existingUser, error: null }
      }
      return { data: null, error: functionError }
    }

    // If function doesn't exist (error code 42883) or other non-critical error, fall back to direct insert
    // This will work if session is available and RLS allows it
    if (functionError && functionError.code === '42883') {
      // Function doesn't exist, try direct insert
      const { data, error } = await supabase
        .from('users')
        .insert(user)
        .select()
        .single()
      return { data, error }
    }

    // Other function errors - return them
    if (functionError) {
      return { data: null, error: functionError }
    }

    // Fallback to direct insert if function didn't return data
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single()
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
}

// Rentals
export const rentalsService = {
  async getUserRentals(userId: string) {
    const { data: rentals, error: rentalsError } = await supabase
      .from('rentals')
      .select('*, device:devices(*, device_type:device_types(*))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (rentalsError || !rentals) return { data: [], error: rentalsError }

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
  async create(
    rental: Omit<Rental, 'id' | 'created_at' | 'updated_at' | 'user' | 'device' | 'accessories'>,
    accessoryIds: { accessory_id: string; quantity: number }[] = []
  ) {
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

      const { error: accessoriesError } = await supabase
        .from('rental_accessories')
        .insert(rentalAccessories)
      
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

    // Send booking confirmation email to customer
    try {
      // Get full rental data with relations for PDF generation
      const { data: fullRental } = await supabase
        .from('rentals')
        .select(`
          *,
          user:users(*),
          device:devices(*, device_type:device_types(*)),
          accessories:rental_accessories(*, accessory:accessories(*))
        `)
        .eq('id', rentalData.id)
        .single()

      if (!fullRental) {
        console.error('Could not fetch full rental data for email')
        return { data: rentalData, error: null }
      }

      const { data: user } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', rental.user_id)
        .single()

      // Generate PDF for attachment (PDF generation is handled server-side in Edge Function)
      // For customer app, we'll let the Edge Function generate the PDF if needed
      // or we can skip PDF generation here since it's mainly an admin feature
      let pdfBase64: string | undefined
      // PDF generation skipped in customer app - Edge Function will handle it if rental data is available

      if (user?.email) {
        const { emailService } = await import('./email-service')
        // Update email service to accept PDF
        await emailService.sendEmail({
          type: 'booking_confirmation',
          rental_id: rentalData.id,
          recipient_email: user.email,
          recipient_name: `${user.first_name} ${user.last_name}`,
          pdf_base64: pdfBase64,
        })
      }
    } catch (emailError) {
      // Don't fail rental creation if email fails
      console.error('Error sending booking confirmation email:', emailError)
    }

    return { data: rentalData, error: null }
  },
}

// Notifications
export const notificationsService = {
  async getUserNotifications(userId: string) {
    // Get user's rentals to find related notifications
    const { data: rentals } = await supabase
      .from('rentals')
      .select('id')
      .eq('user_id', userId)

    if (!rentals || rentals.length === 0) {
      return { data: [], error: null }
    }

    const rentalIds = rentals.map(r => r.id)

    // Get notifications for user's rentals
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .in('reference_id', rentalIds)
      .order('created_at', { ascending: false })

    return { data: data ?? [], error }
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
  async markAllAsRead(userId: string) {
    const { data: rentals } = await supabase
      .from('rentals')
      .select('id')
      .eq('user_id', userId)

    if (!rentals || rentals.length === 0) {
      return { error: null }
    }

    const rentalIds = rentals.map(r => r.id)

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('reference_id', rentalIds)
      .eq('is_read', false)

    return { error }
  },
}

