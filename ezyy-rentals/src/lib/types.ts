export interface User {
  id: string
  first_name: string
  last_name: string
  telephone: string
  address: string
  city: string | null
  country: string | null
  id_number: string
  email: string
  date_of_birth: string
  profile_picture: string | null
  next_of_kin_first_name: string
  next_of_kin_last_name: string
  next_of_kin_phone_number: string
  created_at: string
  updated_at: string
}

export interface DeviceType {
  id: string
  name: string
  sku: string
  rental_rate: number
  deposit: number
  model: string
  has_subscription: boolean
  subscription_cost: number | null
  images: string[]
  created_at: string
  updated_at: string
}

export interface Accessory {
  id: string
  name: string
  description: string | null
  quantity: number
  rental_rate: number
  images: string[]
  device_type_id: string | null // Kept for backward compatibility
  device_type_ids?: string[] // Array of device type IDs from junction table
  created_at: string
  updated_at: string
}

export interface Device {
  id: string
  name: string
  device_type_id: string
  condition: string
  scratches: string | null
  working_state: string
  subscription_date: string | null
  created_at: string
  updated_at: string
  device_type?: DeviceType
}

export interface Rental {
  id: string
  user_id: string
  device_id: string
  start_date: string
  end_date: string
  rate: number
  deposit: number
  total_paid: number
  returned_date: string | null
  shipped_date: string | null
  delivery_method: 'collection' | 'shipping'
  shipping_address: string | null
  created_at: string
  updated_at: string
  user?: User
  device?: Device
  accessories?: RentalAccessory[]
}

export interface RentalAccessory {
  id: string
  rental_id: string
  accessory_id: string
  quantity: number
  created_at: string
  accessory?: Accessory
}

export interface SubscriptionPayment {
  id: string
  device_id: string
  payment_date: string
  amount: number
  payment_method: string
  notes: string | null
  status: 'Paid' | 'Pending'
  created_at: string
  updated_at: string
  device?: Device
}

export interface Notification {
  id: string
  type: 'subscription_due' | 'rental_due' | 'rental_overdue'
  reference_id: string
  message: string
  is_read: boolean
  created_at: string
}

export interface DeviceTypeAvailability {
  device_type: DeviceType
  available_count: number // Only available devices (working, not rented, subscription paid)
  total_count?: number // Total devices in catalog (including unavailable)
  sample_device?: Device // For display/reference
}

export interface CartItem {
  device_type_id: string
  device_type: DeviceType
  quantity: number
  start_date: string
  end_date: string
  accessories: { accessory_id: string; quantity: number }[]
}

