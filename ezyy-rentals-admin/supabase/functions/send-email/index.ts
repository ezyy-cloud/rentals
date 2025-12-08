import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@2.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  type: 'booking_confirmation' | 'booking_notification' | 'due_return_7days' | 'due_return_1day' | 'overdue_rental' | 'subscription_due' | 'rental_agreement'
  rental_id?: string
  user_id?: string
  device_id?: string
  recipient_email: string
  recipient_name?: string
  admin_email?: string
  custom_data?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const resend = new Resend(resendApiKey)

    const emailRequest: EmailRequest = await req.json()

    // Get system settings
    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1)
      .single()

    const companyName = settings?.company_name ?? 'Ezyy Rentals'
    const companyEmail = settings?.email ?? 'info@ezyyrentals.com'
    const companyPhone = settings?.phone ?? '(555) 123-4567'
    const companyWebsite = settings?.website ?? 'www.ezyyrentals.com'

    let emailSubject = ''
    let emailHtml = ''
    let attachments: Array<{ filename: string; content: string; type: string }> = []

    // Fetch rental data if rental_id is provided
    let rental: any = null
    if (emailRequest.rental_id) {
      const { data: rentalData } = await supabase
        .from('rentals')
        .select(`
          *,
          user:users(*),
          device:devices(*, device_type:device_types(*)),
          accessories:rental_accessories(*, accessory:accessories(*))
        `)
        .eq('id', emailRequest.rental_id)
        .single()
      rental = rentalData
    }

    // Generate PDF if needed (for booking confirmation and rental agreement)
    if ((emailRequest.type === 'booking_confirmation' || emailRequest.type === 'rental_agreement' || emailRequest.type === 'booking_notification') && rental) {
      try {
        // Generate PDF using a simple approach - we'll create a basic PDF in the edge function
        // For production, you might want to use a PDF generation service or pre-generate PDFs
        const pdfContent = await generateRentalPDF(rental, settings)
        if (pdfContent) {
          attachments.push({
            filename: `rental-agreement-${rental.id.substring(0, 8)}.pdf`,
            content: pdfContent,
            type: 'application/pdf',
          })
        }
      } catch (error) {
        console.error('Error generating PDF:', error)
        // Continue without PDF attachment
      }
    }

    // Generate email content based on type
    switch (emailRequest.type) {
      case 'booking_confirmation':
        emailSubject = `Booking Confirmation - ${companyName}`
        emailHtml = generateBookingConfirmationEmail(rental, companyName, companyEmail, companyPhone, companyWebsite)
        break

      case 'booking_notification':
        emailSubject = `New Booking - ${rental?.device?.name ?? 'Device'}`
        emailHtml = generateBookingNotificationEmail(rental, companyName, companyEmail, companyPhone)
        break

      case 'due_return_7days':
        emailSubject = `Reminder: Rental Due in 7 Days - ${companyName}`
        emailHtml = generateDueReturnEmail(rental, 7, companyName, companyEmail, companyPhone)
        break

      case 'due_return_1day':
        emailSubject = `Reminder: Rental Due Tomorrow - ${companyName}`
        emailHtml = generateDueReturnEmail(rental, 1, companyName, companyEmail, companyPhone)
        break

      case 'overdue_rental':
        emailSubject = `Urgent: Overdue Rental - ${companyName}`
        emailHtml = generateOverdueRentalEmail(rental, companyName, companyEmail, companyPhone)
        break

      case 'subscription_due':
        emailSubject = `Subscription Payment Due - ${companyName}`
        emailHtml = generateSubscriptionDueEmail(emailRequest.custom_data, companyName, companyEmail)
        break

      case 'rental_agreement':
        emailSubject = `Rental Agreement - ${companyName}`
        emailHtml = generateRentalAgreementEmail(rental, companyName, companyEmail, companyPhone)
        break

      default:
        throw new Error(`Unknown email type: ${emailRequest.type}`)
    }

    // Send email
    // Note: The "from" email must be verified in Resend
    // For testing, you can use: onboarding@resend.dev
    // For production, verify your domain/email in Resend dashboard
    const fromEmail = companyEmail || 'onboarding@resend.dev'
    
    const emailResult = await resend.emails.send({
      from: `${companyName} <${fromEmail}>`,
      to: emailRequest.recipient_email,
      subject: emailSubject,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    
    // Check for errors in the response
    if (emailResult.error) {
      throw new Error(`Resend API error: ${JSON.stringify(emailResult.error)}`)
    }

    // If admin email is provided and type is booking_notification, send to admin too
    if (emailRequest.type === 'booking_notification' && emailRequest.admin_email) {
      const adminEmailResult = await resend.emails.send({
        from: `${companyName} <${fromEmail}>`,
        to: emailRequest.admin_email,
        subject: emailSubject,
        html: emailHtml,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      
      if (adminEmailResult.error) {
        console.error('Error sending admin notification:', adminEmailResult.error)
        // Don't throw - main email was sent successfully
      }
    }

    return new Response(
      JSON.stringify({ success: true, messageId: emailResult.data?.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    
    // Provide more helpful error messages for common issues
    let errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    if (errorMessage.includes('403') || errorMessage.includes('Forbidden')) {
      errorMessage = '403 Forbidden: The "from" email address is not verified in Resend. Please verify your email address in the Resend dashboard (Domains → Add Email) or use onboarding@resend.dev for testing.'
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
      errorMessage = '401 Unauthorized: Invalid API key. Please check your RESEND_API_KEY in Supabase Edge Function secrets.'
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Email template generators
function generateBookingConfirmationEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string, companyWebsite: string): string {
  const startDate = new Date(rental.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const endDate = new Date(rental.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const daysRented = Math.ceil((new Date(rental.end_date).getTime() - new Date(rental.start_date).getTime()) / (1000 * 60 * 60 * 24))
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Booking Confirmation</h1>
        <p>Dear ${rental.user?.first_name ?? 'Customer'},</p>
        <p>Thank you for your booking with ${companyName}! We're excited to have you as our customer.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Rental Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Device:</td>
            <td style="padding: 8px 0;">${rental.device?.name ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Device Type:</td>
            <td style="padding: 8px 0;">${rental.device?.device_type?.name ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
            <td style="padding: 8px 0;">${startDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
            <td style="padding: 8px 0;">${endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Rental Period:</td>
            <td style="padding: 8px 0;">${daysRented} day(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Delivery Method:</td>
            <td style="padding: 8px 0;">${rental.delivery_method === 'shipping' ? 'Shipping' : 'Collection'}</td>
          </tr>
          ${rental.delivery_method === 'shipping' && rental.shipping_address ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Shipping Address:</td>
            <td style="padding: 8px 0;">${rental.shipping_address}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Daily Rate:</td>
            <td style="padding: 8px 0;">$${rental.rate.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Security Deposit:</td>
            <td style="padding: 8px 0;">$${rental.deposit.toFixed(2)}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Total Paid:</td>
            <td style="padding: 8px 0;">$${rental.total_paid.toFixed(2)}</td>
          </tr>
        </table>
        ${rental.accessories && rental.accessories.length > 0 ? `
        <h3 style="color: #2c3e50; margin-top: 20px;">Accessories Included:</h3>
        <ul>
          ${rental.accessories.map((ra: any) => `<li>${ra.accessory?.name ?? 'N/A'} (Quantity: ${ra.quantity})</li>`).join('')}
        </ul>
        ` : ''}
      </div>

      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>📎 Your rental agreement PDF is attached to this email.</strong></p>
        <p style="margin: 10px 0 0 0;">Please review the terms and conditions carefully. If you have any questions, don't hesitate to contact us.</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;"><strong>${companyName}</strong></p>
        <p style="margin: 5px 0;">Email: ${companyEmail}</p>
        <p style="margin: 5px 0;">Phone: ${companyPhone}</p>
        ${companyWebsite ? `<p style="margin: 5px 0;">Website: ${companyWebsite}</p>` : ''}
      </div>
    </body>
    </html>
  `
}

function generateBookingNotificationEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string): string {
  const startDate = new Date(rental.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const endDate = new Date(rental.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking Notification</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h1 style="color: #856404; margin-top: 0;">🔔 New Booking Received</h1>
        <p>A new rental booking has been created and requires your attention.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Customer Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Name:</td>
            <td style="padding: 8px 0;">${rental.user?.first_name ?? ''} ${rental.user?.last_name ?? ''}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Email:</td>
            <td style="padding: 8px 0;">${rental.user?.email ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
            <td style="padding: 8px 0;">${rental.user?.telephone ?? 'N/A'}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Rental Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Device:</td>
            <td style="padding: 8px 0;">${rental.device?.name ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Start Date:</td>
            <td style="padding: 8px 0;">${startDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">End Date:</td>
            <td style="padding: 8px 0;">${endDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Delivery Method:</td>
            <td style="padding: 8px 0;">${rental.delivery_method === 'shipping' ? 'Shipping' : 'Collection'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Total Paid:</td>
            <td style="padding: 8px 0;">$${rental.total_paid.toFixed(2)}</td>
          </tr>
        </table>
        ${rental.delivery_method === 'shipping' && !rental.shipped_date ? `
        <div style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin-top: 15px;">
          <strong>⚠️ Action Required:</strong> This rental needs to be shipped to the customer.
        </div>
        ` : ''}
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;"><strong>${companyName}</strong></p>
        <p style="margin: 5px 0;">Email: ${companyEmail}</p>
        <p style="margin: 5px 0;">Phone: ${companyPhone}</p>
      </div>
    </body>
    </html>
  `
}

function generateDueReturnEmail(rental: any, daysUntil: number, companyName: string, companyEmail: string, companyPhone: string): string {
  const endDate = new Date(rental.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rental Due Reminder</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h1 style="color: #856404; margin-top: 0;">⏰ Rental Return Reminder</h1>
        <p>Dear ${rental.user?.first_name ?? 'Customer'},</p>
        <p>This is a friendly reminder that your rental is due to be returned in <strong>${daysUntil} day(s)</strong>.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Rental Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Device:</td>
            <td style="padding: 8px 0;">${rental.device?.name ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Return Date:</td>
            <td style="padding: 8px 0;"><strong>${endDate}</strong></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>Please ensure the device is returned on or before the return date to avoid late fees.</strong></p>
        <p style="margin: 10px 0 0 0;">If you need to extend your rental period, please contact us as soon as possible.</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;"><strong>${companyName}</strong></p>
        <p style="margin: 5px 0;">Email: ${companyEmail}</p>
        <p style="margin: 5px 0;">Phone: ${companyPhone}</p>
      </div>
    </body>
    </html>
  `
}

function generateOverdueRentalEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string): string {
  const endDate = new Date(rental.end_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const daysOverdue = Math.ceil((new Date().getTime() - new Date(rental.end_date).getTime()) / (1000 * 60 * 60 * 24))
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Overdue Rental</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8d7da; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #dc3545;">
        <h1 style="color: #721c24; margin-top: 0;">⚠️ Overdue Rental</h1>
        <p>Dear ${rental.user?.first_name ?? 'Customer'},</p>
        <p>Your rental is currently <strong>${daysOverdue} day(s) overdue</strong>. Please return the device immediately to avoid additional charges.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Rental Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Device:</td>
            <td style="padding: 8px 0;">${rental.device?.name ?? 'N/A'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Original Return Date:</td>
            <td style="padding: 8px 0;"><strong>${endDate}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Days Overdue:</td>
            <td style="padding: 8px 0;"><strong style="color: #dc3545;">${daysOverdue} day(s)</strong></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>⚠️ Important:</strong> Late fees may apply for each day the device is retained beyond the return date.</p>
        <p style="margin: 10px 0 0 0;">Please contact us immediately to arrange for the return of the device.</p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;"><strong>${companyName}</strong></p>
        <p style="margin: 5px 0;">Email: ${companyEmail}</p>
        <p style="margin: 5px 0;">Phone: ${companyPhone}</p>
      </div>
    </body>
    </html>
  `
}

function generateSubscriptionDueEmail(customData: any, companyName: string, companyEmail: string): string {
  const deviceName = customData?.device_name ?? 'Device'
  const subscriptionDate = customData?.subscription_date ? new Date(customData.subscription_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'
  const subscriptionCost = customData?.subscription_cost ?? 0
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Subscription Payment Due</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ffc107;">
        <h1 style="color: #856404; margin-top: 0;">💰 Subscription Payment Due</h1>
        <p>A subscription payment is due in 7 days and requires your attention.</p>
      </div>

      <div style="background-color: #ffffff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Subscription Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Device:</td>
            <td style="padding: 8px 0;">${deviceName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Payment Due Date:</td>
            <td style="padding: 8px 0;"><strong>${subscriptionDate}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold;">Amount Due:</td>
            <td style="padding: 8px 0;"><strong>$${subscriptionCost.toFixed(2)}</strong></td>
          </tr>
        </table>
      </div>

      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>Please process the subscription payment before the due date.</strong></p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;"><strong>${companyName}</strong></p>
        <p style="margin: 5px 0;">Email: ${companyEmail}</p>
      </div>
    </body>
    </html>
  `
}

function generateRentalAgreementEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Rental Agreement</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Rental Agreement</h1>
        <p>Dear ${rental.user?.first_name ?? 'Customer'},</p>
        <p>Please find your rental agreement attached to this email.</p>
      </div>

      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>📎 Your rental agreement PDF is attached to this email.</strong></p>
      </div>

      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center;">
        <p style="margin: 0;"><strong>${companyName}</strong></p>
        <p style="margin: 5px 0;">Email: ${companyEmail}</p>
        <p style="margin: 5px 0;">Phone: ${companyPhone}</p>
      </div>
    </body>
    </html>
  `
}

// Simple PDF generation function (basic implementation)
// For production, consider using a proper PDF generation service
async function generateRentalPDF(rental: any, settings: any): Promise<string | null> {
  try {
    // This is a simplified version - in production, you'd want to use a proper PDF library
    // or call a PDF generation service. For now, we'll return null and handle it gracefully
    // The PDF should ideally be generated server-side using a proper library
    
    // Note: jsPDF doesn't work in Deno edge functions directly
    // You might want to:
    // 1. Pre-generate PDFs and store them
    // 2. Use a PDF generation service
    // 3. Generate PDFs in a separate service
    
    return null
  } catch (error) {
    console.error('PDF generation error:', error)
    return null
  }
}

