import type { User } from './types'

/**
 * Check if a user's profile is complete
 * Required fields: first_name, last_name, telephone, address, id_number, 
 * date_of_birth, next_of_kin_first_name, next_of_kin_last_name, next_of_kin_phone_number
 */
export function isProfileComplete(user: User | null): boolean {
  if (!user) return false

  const requiredFields = [
    user.first_name,
    user.last_name,
    user.telephone,
    user.address,
    user.id_number,
    user.date_of_birth,
    user.next_of_kin_first_name,
    user.next_of_kin_last_name,
    user.next_of_kin_phone_number,
  ]

  // Check if all required fields are filled (not empty strings)
  return requiredFields.every((field) => field && field.trim().length > 0)
}

