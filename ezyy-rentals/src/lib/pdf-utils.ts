import jsPDF from 'jspdf'
import type { Rental } from './types'
import type { SystemSettings } from './settings-service'
import { settingsService } from './settings-service'

/**
 * Generate rental PDF and return as base64 string for email attachments
 */
export async function generateRentalPDFBase64(rental: Rental, logoUrl?: string, settings?: SystemSettings): Promise<string> {
  try {
    console.log('generateRentalPDFBase64: Starting PDF generation')
    console.log('generateRentalPDFBase64: Rental ID:', rental?.id)
    console.log('generateRentalPDFBase64: Settings:', settings ? 'provided' : 'not provided')
    
    const doc = await generateRentalPDF(rental, logoUrl, settings)
    console.log('generateRentalPDFBase64: PDF document generated successfully')
    
    // Convert PDF to base64 string using arraybuffer method for better compatibility
    try {
      // Use arraybuffer output and convert to base64
      const pdfArrayBuffer = doc.output('arraybuffer')
      console.log('generateRentalPDFBase64: PDF arraybuffer size:', pdfArrayBuffer.byteLength)
      
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(pdfArrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)
      console.log('generateRentalPDFBase64: Base64 conversion successful, length:', base64.length)
      return base64
    } catch (error) {
      console.error('generateRentalPDFBase64: Error converting PDF to base64 using arraybuffer:', error)
      // Fallback to datauristring method
      console.log('generateRentalPDFBase64: Trying fallback method (datauristring)')
      const pdfOutput = doc.output('datauristring')
      const base64Match = pdfOutput.match(/base64,(.+)/)
      const result = base64Match ? base64Match[1] : pdfOutput
      console.log('generateRentalPDFBase64: Fallback successful, length:', result.length)
      return result
    }
  } catch (error) {
    console.error('generateRentalPDFBase64: Fatal error generating PDF:', error)
    console.error('generateRentalPDFBase64: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    throw error // Re-throw to let caller handle it
  }
}

export async function generateRentalPDF(rental: Rental, logoUrl?: string, settings?: SystemSettings) {
  // Get settings if not provided
  if (!settings) {
    const { data } = await settingsService.getSettings()
    settings = data ?? undefined
  }

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  const margin = 20
  const contentWidth = pageWidth - (margin * 2)
  
  let yPos = 15
  
  // Add Logo
  if (logoUrl) {
    try {
      doc.addImage(logoUrl, 'PNG', margin, yPos, 40, 15)
      yPos += 18
    } catch (error) {
      console.warn('Could not load logo image, using text logo:', error)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(settings?.company_name ?? 'Ezyy Rentals', margin, yPos + 10)
      yPos += 18
    }
  } else {
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(settings?.company_name ?? 'Ezyy Rentals', margin, yPos + 10)
    yPos += 18
  }
  
  // Company contact info
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const companyInfo = [
    `Email: ${settings?.email ?? 'info@ezyyrentals.com'}`,
    `Phone: ${settings?.phone ?? '(555) 123-4567'}`,
    `Website: ${settings?.website ?? 'www.ezyyrentals.com'}`,
  ]
  companyInfo.forEach((info, index) => {
    doc.text(info, pageWidth - margin, yPos + (index * 4), { align: 'right' })
  })
  
  yPos += 15
  
  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('EQUIPMENT RENTAL AGREEMENT', pageWidth / 2, yPos, { align: 'center' })
  yPos += 10
  
  // Agreement Date
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(`Agreement Date: ${new Date(rental.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}`, margin, yPos)
  doc.text(`Agreement ID: ${rental.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, yPos, { align: 'right' })
  yPos += 12
  
  // Section 1: PARTIES
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('1. PARTIES', margin, yPos)
  yPos += 8
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('This Rental Agreement ("Agreement") is entered into between:', margin + 5, yPos)
  yPos += 6
  
  // Lessor (Company)
  doc.setFont('helvetica', 'bold')
  doc.text('LESSOR (Owner):', margin + 5, yPos)
  yPos += 6
  doc.setFont('helvetica', 'normal')
  doc.text(settings?.company_name ?? 'Ezyy Rentals', margin + 10, yPos)
  yPos += 5
  doc.text(`Email: ${settings?.email ?? 'info@ezyyrentals.com'}`, margin + 10, yPos)
  yPos += 5
  doc.text(`Phone: ${settings?.phone ?? '(555) 123-4567'}`, margin + 10, yPos)
  if (settings?.address) {
    yPos += 5
    doc.text(`Address: ${settings.address}`, margin + 10, yPos)
  }
  yPos += 8
  
  // Lessee (Customer)
  doc.setFont('helvetica', 'bold')
  doc.text('LESSEE (Renter):', margin + 5, yPos)
  yPos += 6
  doc.setFont('helvetica', 'normal')
  if (rental.user) {
    doc.text(`${rental.user.first_name} ${rental.user.last_name}`, margin + 10, yPos)
    yPos += 5
    doc.text(`Email: ${rental.user.email}`, margin + 10, yPos)
    yPos += 5
    doc.text(`Phone: ${rental.user.telephone}`, margin + 10, yPos)
    yPos += 5
    doc.text(`ID Number: ${rental.user.id_number}`, margin + 10, yPos)
    yPos += 5
    doc.text(`Address: ${rental.user.address}`, margin + 10, yPos)
    if (rental.user.city) {
      yPos += 5
      doc.text(`${rental.user.city}${rental.user.country ? `, ${rental.user.country}` : ''}`, margin + 10, yPos)
    }
  } else {
    doc.text('Customer information not available', margin + 10, yPos)
  }
  yPos += 12
  
  // Section 2: EQUIPMENT
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('2. EQUIPMENT', margin, yPos)
  yPos += 8
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  if (rental.device) {
    const deviceDetails = [
      `Device Name: ${rental.device.name}`,
      `Device Type: ${rental.device.device_type?.name ?? 'N/A'}`,
      `Model: ${rental.device.device_type?.model ?? 'N/A'}`,
      `Condition: ${rental.device.condition}`,
      `Working State: ${rental.device.working_state}`,
    ]
    
    deviceDetails.forEach((detail) => {
      doc.text(detail, margin + 5, yPos)
      yPos += 5
    })
    
    // Accessories
    if (rental.accessories && rental.accessories.length > 0) {
      yPos += 3
      doc.text('Accessories Included:', margin + 5, yPos)
      yPos += 5
      rental.accessories.forEach((ra) => {
        doc.text(`• ${ra.accessory?.name ?? 'N/A'} (Quantity: ${ra.quantity})`, margin + 10, yPos)
        yPos += 5
      })
    }
  } else {
    doc.text('Device information not available', margin + 5, yPos)
    yPos += 5
  }
  yPos += 8
  
  // Section 3: RENTAL TERMS
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('3. RENTAL TERMS', margin, yPos)
  yPos += 8
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const startDate = new Date(rental.start_date)
  const endDate = new Date(rental.end_date)
  const daysRented = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  
  const rentalTerms = [
    `Rental Start Date: ${startDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`,
    `Rental End Date: ${endDate.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`,
    `Rental Period: ${daysRented} day(s)`,
    `Delivery Method: ${rental.delivery_method === 'shipping' ? 'Shipping' : 'Collection'}`,
  ]
  
  if (rental.delivery_method === 'shipping' && rental.shipping_address) {
    rentalTerms.push(`Shipping Address: ${rental.shipping_address}`)
  }
  
  if (rental.shipped_date) {
    rentalTerms.push(`Shipped Date: ${new Date(rental.shipped_date).toLocaleDateString()}`)
  }
  
  if (rental.returned_date) {
    rentalTerms.push(`Returned Date: ${new Date(rental.returned_date).toLocaleDateString()}`)
  }
  
  rentalTerms.forEach((term) => {
    doc.text(term, margin + 5, yPos)
    yPos += 5
  })
  yPos += 8
  
  // Section 4: FINANCIAL TERMS
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('4. FINANCIAL TERMS', margin, yPos)
  yPos += 8
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const rentalCost = rental.rate * daysRented
  const accessoriesCost = (rental.accessories ?? []).reduce((sum, ra) => {
    const accessoryRate = ra.accessory?.rental_rate ?? 0
    return sum + (accessoryRate * daysRented * ra.quantity)
  }, 0)
  const subtotal = rentalCost + accessoriesCost
  
  const financialTerms = [
    `Daily Rental Rate: $${rental.rate.toFixed(2)}`,
    `Rental Period: ${daysRented} day(s)`,
    `Subtotal (Device): $${rentalCost.toFixed(2)}`,
  ]
  
  if (accessoriesCost > 0) {
    financialTerms.push(`Subtotal (Accessories): $${accessoriesCost.toFixed(2)}`)
  }
  
  financialTerms.push(
    `Total Rental Fee: $${subtotal.toFixed(2)}`,
    `Security Deposit: $${rental.deposit.toFixed(2)}`,
    `Total Amount Paid: $${rental.total_paid.toFixed(2)}`,
    `Payment Method: ${rental.delivery_method === 'shipping' ? 'Cash On Delivery' : 'Cash on Collection'}`
  )
  
  financialTerms.forEach((term) => {
    doc.text(term, margin + 5, yPos)
    yPos += 5
  })
  yPos += 12
  
  // Check if we need a new page for legal clauses
  if (yPos > 220) {
    doc.addPage()
    yPos = 20
  }
  
  // Section 5: TERMS AND CONDITIONS
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('5. TERMS AND CONDITIONS', margin, yPos)
  yPos += 8
  
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  
  const legalClauses = [
    '5.1 USE OF EQUIPMENT: The Lessee agrees to use the equipment solely for its intended purpose and in accordance with all applicable laws and regulations.',
    '5.2 CARE AND MAINTENANCE: The Lessee agrees to maintain the equipment in good condition, normal wear and tear excepted.',
    '5.3 RETURN OF EQUIPMENT: The Lessee agrees to return the equipment on or before the Rental End Date specified in Section 3.',
    '5.4 LATE RETURN: If the equipment is not returned by the Rental End Date, the Lessee shall be charged an additional daily rental fee.',
    '5.5 SECURITY DEPOSIT: The security deposit will be refunded to the Lessee upon return of the equipment in satisfactory condition.',
    '5.6 LIABILITY: The Lessor is not responsible for any loss, damage, or injury resulting from the use or misuse of the equipment.',
    '5.7 INSURANCE: The Lessee is responsible for insuring the equipment against loss, theft, or damage during the rental period.',
    '5.8 DEFAULT: If the Lessee fails to comply with any term of this Agreement, the Lessor may terminate this Agreement.',
    '5.9 ENTIRE AGREEMENT: This Agreement constitutes the entire agreement between the parties.',
    '5.10 GOVERNING LAW: This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which the Lessor operates.',
  ]
  
  legalClauses.forEach((clause) => {
    const lines = doc.splitTextToSize(clause, contentWidth - 10)
    lines.forEach((line: string) => {
      if (yPos > 270) {
        doc.addPage()
        yPos = 20
      }
      doc.text(line, margin + 5, yPos)
      yPos += 4
    })
    yPos += 2
  })
  
  yPos += 8
  
  // Check if we need a new page for signatures
  if (yPos > 200) {
    doc.addPage()
    yPos = 20
  }
  
  // Section 6: SIGNATURES
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('6. SIGNATURES', margin, yPos)
  yPos += 12
  
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const signatureText = 'By signing below, both parties acknowledge that they have read, understood, and agree to be bound by all terms and conditions of this Agreement.'
  const signatureLines = doc.splitTextToSize(signatureText, contentWidth)
  signatureLines.forEach((line: string) => {
    doc.text(line, margin, yPos)
    yPos += 5
  })
  yPos += 5
  
  // Lessee Signature
  doc.setFont('helvetica', 'bold')
  doc.text('LESSEE (Renter):', margin, yPos)
  yPos += 8
  
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, yPos, margin + 80, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  if (rental.user) {
    doc.text(`${rental.user.first_name} ${rental.user.last_name}`, margin, yPos)
  } else {
    doc.text('Customer Name', margin, yPos)
  }
  yPos += 4
  doc.text('Signature', margin, yPos)
  yPos += 12
  
  doc.line(margin, yPos, margin + 80, yPos)
  yPos += 5
  doc.text('Date', margin, yPos)
  yPos += 20
  
  // Lessor Signature
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('LESSOR (Owner):', margin, yPos)
  yPos += 8
  
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, yPos, margin + 80, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(settings?.company_name ?? 'Ezyy Rentals', margin, yPos)
  yPos += 4
  doc.text('Authorized Representative', margin, yPos)
  yPos += 12
  
  doc.line(margin, yPos, margin + 80, yPos)
  yPos += 5
  doc.text('Date', margin, yPos)
  
  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, doc.internal.pageSize.height - 15, pageWidth - margin, doc.internal.pageSize.height - 15)
    doc.text(
      `Page ${i} of ${pageCount} | Agreement ID: ${rental.id.substring(0, 8).toUpperCase()} | Generated: ${new Date().toLocaleDateString()}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 8,
      { align: 'center' }
    )
  }
  
  return doc
}

