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
  pdf_base64?: string // Base64 encoded PDF content
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
    // Use notification_email as "from" address (must be verified in Resend)
    // Fallback to companyEmail, then to Resend test email
    const notificationEmail = settings?.notification_email ?? companyEmail ?? 'onboarding@resend.dev'
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

    // Upload PDF to Supabase Storage and get download link
    let pdfDownloadUrl: string | null = null
    if (emailRequest.pdf_base64 && (emailRequest.type === 'booking_confirmation' || emailRequest.type === 'rental_agreement' || emailRequest.type === 'booking_notification')) {
      try {
        console.log('Starting PDF upload to storage...')
        // Convert base64 string to Uint8Array
        const base64String = emailRequest.pdf_base64
        const binaryString = atob(base64String)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const fileName = `rental-${rental?.id?.substring(0, 8) ?? Date.now()}-${Date.now()}.pdf`
        console.log('Uploading PDF with filename:', fileName)
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('rental-agreements')
          .upload(fileName, bytes, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: false
          })
        
        if (uploadError) {
          console.error('Error uploading PDF to storage:', uploadError)
          console.error('Upload error details:', JSON.stringify(uploadError, null, 2))
          // Check if bucket doesn't exist
          if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
            console.error('Storage bucket "rental-agreements" does not exist. Please create it in Supabase Dashboard.')
          }
          // Continue without PDF URL - email will still be sent
        } else if (uploadData) {
          console.log('PDF uploaded successfully, path:', uploadData.path)
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('rental-agreements')
            .getPublicUrl(uploadData.path)
          
          if (urlData?.publicUrl) {
            pdfDownloadUrl = urlData.publicUrl
            console.log('PDF public URL generated:', pdfDownloadUrl)
          } else {
            console.error('Failed to get public URL for uploaded PDF')
            console.error('URL data:', JSON.stringify(urlData, null, 2))
          }
        } else {
          console.error('No upload data returned from storage upload')
        }
      } catch (error) {
        console.error('Error uploading PDF to storage:', error)
        console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
        // Continue without PDF - email will still be sent
      }
    } else {
      console.log('PDF upload skipped - pdf_base64:', !!emailRequest.pdf_base64, 'type:', emailRequest.type)
    }
    
    console.log('PDF download URL before email generation:', pdfDownloadUrl)

    // Generate email content based on type
    switch (emailRequest.type) {
      case 'booking_confirmation':
        emailSubject = `Booking Confirmation - ${companyName}`
        emailHtml = generateBookingConfirmationEmail(rental, companyName, companyEmail, companyPhone, companyWebsite, pdfDownloadUrl)
        break

      case 'booking_notification':
        emailSubject = `New Booking - ${rental?.device?.name ?? 'Device'}`
        emailHtml = generateBookingNotificationEmail(rental, companyName, companyEmail, companyPhone, pdfDownloadUrl)
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
        emailHtml = generateRentalAgreementEmail(rental, companyName, companyEmail, companyPhone, pdfDownloadUrl)
        break

      default:
        throw new Error(`Unknown email type: ${emailRequest.type}`)
    }

    // Send email
    // Use notification_email as "from" address (must be verified in Resend)
    // Check if sending to the same email address (Resend doesn't allow this)
    if (notificationEmail.toLowerCase() === emailRequest.recipient_email.toLowerCase()) {
      console.warn(`Skipping email send: from and to addresses are the same (${notificationEmail})`)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Cannot send email to the same address as the sender. Please use a different recipient email.' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }
    
    const emailResult = await resend.emails.send({
      from: `${companyName} <${notificationEmail}>`,
      to: emailRequest.recipient_email,
      subject: emailSubject,
      html: emailHtml,
      attachments: attachments.length > 0 ? attachments : undefined,
    })
    
    // Check for errors in the response
    if (emailResult.error) {
      throw new Error(`Resend API error: ${JSON.stringify(emailResult.error)}`)
    }

    // For booking_notification type, the recipient_email is already the admin email
    // So the email has already been sent above. No need to send duplicate.

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
function generateBookingConfirmationEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string, companyWebsite: string, pdfDownloadUrl?: string | null): string {
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

      ${pdfDownloadUrl && pdfDownloadUrl.trim() !== '' ? `
      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>📎 Rental Agreement</strong></p>
        <p style="margin: 10px 0 0 0;">Please click the link below to download the rental agreement and sign it. Produce the signed agreement when receiving the kit.</p>
        <div style="margin-top: 15px; text-align: center;">
          <a href="${pdfDownloadUrl}" style="display: inline-block; background-color: #2c3e50; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Rental Agreement PDF</a>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser: <a href="${pdfDownloadUrl}" style="color: #2c3e50; text-decoration: underline; word-break: break-all;">${pdfDownloadUrl}</a></p>
      </div>
      ` : `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>⚠️ Rental Agreement</strong></p>
        <p style="margin: 10px 0 0 0;">A rental agreement will be provided when you collect the device or upon delivery. Please review and sign it at that time.</p>
      </div>
      `}

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

function generateBookingNotificationEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string, pdfDownloadUrl?: string | null): string {
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
        ${pdfDownloadUrl && pdfDownloadUrl.trim() !== '' ? `
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <p style="margin: 0;"><strong>📎 Rental Agreement PDF:</strong></p>
          <p style="margin: 10px 0 0 0;">Please click the link below to download the rental agreement and sign it. Produce the signed agreement when receiving the kit.</p>
          <div style="margin-top: 10px;">
            <a href="${pdfDownloadUrl}" style="display: inline-block; background-color: #2c3e50; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Rental Agreement PDF</a>
          </div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">Link: <a href="${pdfDownloadUrl}" style="color: #2c3e50; text-decoration: underline; word-break: break-all;">${pdfDownloadUrl}</a></p>
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

function generateRentalAgreementEmail(rental: any, companyName: string, companyEmail: string, companyPhone: string, pdfDownloadUrl?: string | null): string {
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
        <p>Please find your rental agreement available for download below.</p>
      </div>

      ${pdfDownloadUrl && pdfDownloadUrl.trim() !== '' ? `
      <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>📎 Rental Agreement</strong></p>
        <p style="margin: 10px 0 0 0;">Please click the link below to download the rental agreement and sign it. Produce the signed agreement when receiving the kit.</p>
        <div style="margin-top: 15px; text-align: center;">
          <a href="${pdfDownloadUrl}" style="display: inline-block; background-color: #2c3e50; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download Rental Agreement PDF</a>
        </div>
        <p style="margin: 15px 0 0 0; font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link into your browser: <a href="${pdfDownloadUrl}" style="color: #2c3e50; text-decoration: underline; word-break: break-all;">${pdfDownloadUrl}</a></p>
      </div>
      ` : `
      <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p style="margin: 0;"><strong>⚠️ Rental Agreement</strong></p>
        <p style="margin: 10px 0 0 0;">A rental agreement will be provided when you collect the device or upon delivery.</p>
      </div>
      `}

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

