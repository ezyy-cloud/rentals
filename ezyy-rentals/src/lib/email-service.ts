import { supabase } from './supabase'

export type EmailType = 
  | 'booking_confirmation' 
  | 'booking_notification' 
  | 'due_return_7days' 
  | 'due_return_1day' 
  | 'overdue_rental' 
  | 'subscription_due' 
  | 'rental_agreement'

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

      // Log PDF status before sending
      if (params.pdf_base64) {
        console.log('Customer app: Sending email with PDF, PDF length:', params.pdf_base64.length)
        console.log('Customer app: PDF base64 preview (first 100 chars):', params.pdf_base64.substring(0, 100))
      } else {
        console.warn('Customer app: Sending email without PDF - pdf_base64 is missing!')
        console.log('Customer app: Email params:', JSON.stringify({ ...params, pdf_base64: params.pdf_base64 ? 'PRESENT' : 'MISSING' }))
      }

      const requestBody = JSON.stringify(params)
      console.log('Customer app: Request body size:', requestBody.length, 'bytes')
      console.log('Customer app: Request body includes pdf_base64:', requestBody.includes('pdf_base64'))

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
      console.error('Error sending email:', error)
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
      pdf_base64: pdfBase64,
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
}

