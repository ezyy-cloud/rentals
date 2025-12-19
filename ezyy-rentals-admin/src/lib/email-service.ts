import { supabase } from './supabase'

export type EmailType = 
  | 'booking_confirmation' 
  | 'booking_notification' 
  | 'due_return_7days' 
  | 'due_return_1day' 
  | 'overdue_rental' 
  | 'subscription_due' 
  | 'rental_agreement'
  | 'rental_update'
  | 'rental_delivered'
  | 'rental_returned'

interface SendEmailParams {
  type: EmailType
  rental_id?: string
  user_id?: string
  device_id?: string
  recipient_email: string
  recipient_name?: string
  admin_email?: string
  custom_data?: Record<string, any>
  pdf_base64?: string // Base64 encoded PDF content
}

export const emailService = {
  /**
   * Send an email via Supabase Edge Function
   */
  async sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL is not configured')
      }

      // Get the current session to use the access token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      const requestBody = JSON.stringify(params)

      const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
        },
        body: requestBody,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(errorData.error ?? `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return { success: result.success ?? false, error: result.error }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }
    }
  },

  /**
   * Send booking confirmation email to customer
   */
  async sendBookingConfirmation(rentalId: string, customerEmail: string, customerName?: string, pdfBase64?: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'booking_confirmation',
      rental_id: rentalId,
      recipient_email: customerEmail,
      recipient_name: customerName,
      pdf_base64: pdfBase64,
    })
  },

  /**
   * Send booking notification email to admin
   */
  async sendBookingNotification(rentalId: string, adminEmail: string, pdfBase64?: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'booking_notification',
      rental_id: rentalId,
      recipient_email: adminEmail,
      admin_email: adminEmail,
      pdf_base64: pdfBase64,
    })
  },

  /**
   * Send due return reminder email
   */
  async sendDueReturnReminder(rentalId: string, customerEmail: string, daysUntil: 7 | 1): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: daysUntil === 7 ? 'due_return_7days' : 'due_return_1day',
      rental_id: rentalId,
      recipient_email: customerEmail,
    })
  },

  /**
   * Send overdue rental email
   */
  async sendOverdueRental(rentalId: string, customerEmail: string, adminEmail?: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.sendEmail({
      type: 'overdue_rental',
      rental_id: rentalId,
      recipient_email: customerEmail,
    })

    // Also send to admin if provided
    if (adminEmail && result.success) {
      await this.sendEmail({
        type: 'overdue_rental',
        rental_id: rentalId,
        recipient_email: adminEmail,
      })
    }

    return result
  },

  /**
   * Send subscription due reminder email to admin
   */
  async sendSubscriptionDue(deviceId: string, adminEmail: string, customData: { device_name: string; subscription_date: string; subscription_cost: number }): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'subscription_due',
      device_id: deviceId,
      recipient_email: adminEmail,
      custom_data: customData,
    })
  },

  /**
   * Send rental agreement email to customer
   */
  async sendRentalAgreement(rentalId: string, customerEmail: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'rental_agreement',
      rental_id: rentalId,
      recipient_email: customerEmail,
    })
  },

  /**
   * Send rental update notification email to customer
   */
  async sendRentalUpdate(rentalId: string, customerEmail: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'rental_update',
      rental_id: rentalId,
      recipient_email: customerEmail,
    })
  },

  /**
   * Send rental delivered/shipped notification email to customer
   */
  async sendRentalDelivered(rentalId: string, customerEmail: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'rental_delivered',
      rental_id: rentalId,
      recipient_email: customerEmail,
    })
  },

  /**
   * Send rental returned confirmation email to customer
   */
  async sendRentalReturned(rentalId: string, customerEmail: string): Promise<{ success: boolean; error?: string }> {
    return this.sendEmail({
      type: 'rental_returned',
      rental_id: rentalId,
      recipient_email: customerEmail,
    })
  },
}

