import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Rental } from './supabase-types'
import type { SystemSettings } from './settings-service'
import { settingsService } from './settings-service'

/**
 * Generate rental PDF and return as base64 string for email attachments
 */
export async function generateRentalPDFBase64(rental: Rental, logoUrl?: string, settings?: SystemSettings): Promise<string> {
  try {
    const doc = await generateRentalPDF(rental, logoUrl, settings)
    
    // Convert PDF to base64 string using arraybuffer method for better compatibility
    try {
      // Use arraybuffer output and convert to base64
      const pdfArrayBuffer = doc.output('arraybuffer')
      
      // Convert ArrayBuffer to base64
      const bytes = new Uint8Array(pdfArrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i])
      }
      const base64 = btoa(binary)
      return base64
    } catch (error) {
      // Fallback to datauristring method
      const pdfOutput = doc.output('datauristring')
      const base64Match = pdfOutput.match(/base64,(.+)/)
      const result = base64Match ? base64Match[1] : pdfOutput
      return result
    }
  } catch (error) {
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
  // If logoUrl is provided, it should be a base64 encoded image or a data URL
  // Example: 'data:image/png;base64,iVBORw0KGgo...' or a URL to an image
  if (logoUrl) {
    try {
      // Try to add the logo image (40x15mm size)
      doc.addImage(logoUrl, 'PNG', margin, yPos, 40, 15)
      yPos += 18
    } catch (error) {
      // Fallback to text logo if image fails to load
      console.warn('Could not load logo image, using text logo:', error)
      doc.setFontSize(18)
      doc.setFont('helvetica', 'bold')
      doc.text(settings?.company_name ?? 'Ezyy Rentals', margin, yPos + 10)
      yPos += 18
    }
  } else {
    // Text logo
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(settings?.company_name ?? 'Ezyy Rentals', margin, yPos + 10)
    yPos += 18
  }
  
  // Company contact info (smaller, right-aligned)
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
    '5.1 USE OF EQUIPMENT: The Lessee agrees to use the equipment solely for its intended purpose and in accordance with all applicable laws and regulations. The Lessee shall not modify, alter, or tamper with the equipment in any way.',
    '5.2 CARE AND MAINTENANCE: The Lessee agrees to maintain the equipment in good condition, normal wear and tear excepted. The Lessee shall be responsible for any damage beyond normal wear and tear.',
    '5.3 RETURN OF EQUIPMENT: The Lessee agrees to return the equipment on or before the Rental End Date specified in Section 3, in the same condition as received, normal wear and tear excepted.',
    '5.4 LATE RETURN: If the equipment is not returned by the Rental End Date, the Lessee shall be charged an additional daily rental fee for each day the equipment is retained beyond the rental period.',
    '5.5 SECURITY DEPOSIT: The security deposit will be refunded to the Lessee upon return of the equipment in satisfactory condition, less any charges for damage, repairs, or cleaning.',
    '5.6 LIABILITY: The Lessor is not responsible for any loss, damage, or injury resulting from the use or misuse of the equipment. The Lessee assumes all risks and liabilities associated with the equipment.',
    '5.7 INSURANCE: The Lessee is responsible for insuring the equipment against loss, theft, or damage during the rental period. The Lessee shall be liable for the full replacement value of the equipment if it is lost, stolen, or damaged beyond repair.',
    '5.8 DEFAULT: If the Lessee fails to comply with any term of this Agreement, the Lessor may terminate this Agreement and take immediate possession of the equipment without notice or legal process.',
    '5.9 ENTIRE AGREEMENT: This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements, whether written or oral, relating to the subject matter hereof.',
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
  
  // Signature line
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
  
  // Date line for Lessee
  doc.line(margin, yPos, margin + 80, yPos)
  yPos += 5
  doc.text('Date', margin, yPos)
  yPos += 20
  
  // Lessor Signature
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('LESSOR (Owner):', margin, yPos)
  yPos += 8
  
  // Signature line
  doc.setDrawColor(0, 0, 0)
  doc.line(margin, yPos, margin + 80, yPos)
  yPos += 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(settings?.company_name ?? 'Ezyy Rentals', margin, yPos)
  yPos += 4
  doc.text('Authorized Representative', margin, yPos)
  yPos += 12
  
  // Date line for Lessor
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

export function generateAllRentalsPDF(rentals: Rental[]) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('All Rentals Report', 105, 20, { align: 'center' })
  
  doc.setFontSize(10)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 30, { align: 'center' })
  
  // Prepare table data
  const tableData = rentals.map((rental) => [
    rental.user ? `${rental.user.first_name} ${rental.user.last_name}` : 'N/A',
    rental.device?.name ?? 'N/A',
    new Date(rental.start_date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    new Date(rental.end_date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
    `$${rental.rate.toFixed(2)}`,
    `$${rental.deposit.toFixed(2)}`,
    `$${rental.total_paid.toFixed(2)}`,
    rental.returned_date ? new Date(rental.returned_date).toLocaleDateString() : 'Not returned',
  ])
  
  autoTable(doc, {
    startY: 40,
    head: [['User', 'Device', 'Start Date', 'End Date', 'Rate', 'Deposit', 'Total Paid', 'Returned']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    styles: { fontSize: 8 },
    margin: { left: 10, right: 10 },
  })
  
  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Page ${i} of ${pageCount}`,
      105,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    )
  }
  
  return doc
}

/**
 * Helper function to convert an image URL or file to base64 data URL for use in PDF
 * This can be used to load a logo image before generating the PDF
 * 
 * @param imageUrl - URL to the image or path to image file
 * @returns Promise<string> - Base64 data URL of the image
 * 
 * @example
 * const logoDataUrl = await convertImageToBase64('/path/to/logo.png')
 * downloadRentalPDF(rental, logoDataUrl)
 */
export async function convertImageToBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      } else {
        reject(new Error('Could not get canvas context'))
      }
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = imageUrl
  })
}

/**
 * Helper function to convert SVG to base64 data URL for use in PDF
 * 
 * @param svgString - SVG content as string
 * @returns Promise<string> - Base64 data URL of the SVG as PNG
 */
export async function convertSVGToBase64(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    // Create a data URL from the SVG string
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    
    // Set a timeout to avoid hanging
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url)
      reject(new Error('Timeout loading SVG'))
    }, 5000)
    
    img.onload = () => {
      clearTimeout(timeout)
      try {
        // Set canvas size - use naturalWidth/Height or fallback to viewBox size (300x300)
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || img.width || 300
        const height = img.naturalHeight || img.height || 300
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          reject(new Error('Could not get canvas context'))
          return
        }
        
        // Fill with white background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
        
        // Draw the image on canvas
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/png')
        URL.revokeObjectURL(url)
        resolve(dataUrl)
      } catch (error) {
        URL.revokeObjectURL(url)
        reject(error instanceof Error ? error : new Error('Unknown error'))
      }
    }
    
    img.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load SVG image'))
    }
    
    img.src = url
  })
}

/**
 * Load the Ezyy logo from assets and convert to base64
 * This function loads the SVG logo and converts it for use in PDFs
 */
export async function loadEzyyLogo(): Promise<string | null> {
  // SVG content from ezyy.svg file - changed fill to black for visibility on white PDF background
  const svgContent = `<svg id="eyW0INQqrKd1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 300 300" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" project-id="0d431cb9a01b4f749f2aa3b10f0355fc" export-id="319bce90cef742219742fe25c74e6727" cached="false"><path d="M159.29666,61.34757c55.35643-.61882,100.72746,43.2286,101.33903,97.93596s-43.76791,99.55809-99.12435,100.17692c-30.44635.34036-57.87206-12.7706-76.49141-33.74146l102.335788-47.897857L66.3056,126.21442c13.95626-37.47079,50.19297-64.3884,92.99105-64.86684l.00001-.00001Zm2.84701,67.94159c13.80712,0,25-11.19288,25-25s-11.19288-25-25-25-25,11.19288-25,25s11.19288,25,25,25Z" transform="matrix(-1 0 0 1 313.473693 -10.404032)" fill="#000000" stroke-width="0"/></svg>`
  
  try {
    // First try to load from import (in case it's available)
    try {
      const logoModule = await import('@/assets/ezyy.svg?url')
      const logoUrl = logoModule.default
      
      if (typeof logoUrl === 'string' && logoUrl.startsWith('data:')) {
        return logoUrl
      }
      
      if (typeof logoUrl === 'string') {
        try {
          const response = await fetch(logoUrl)
          if (response.ok) {
            const fetchedSvg = await response.text()
            return await convertSVGToBase64(fetchedSvg)
          }
        } catch {
          // Fall through to use embedded SVG
        }
      }
    } catch {
      // Fall through to use embedded SVG
    }
    
    // Use embedded SVG content as fallback
    return await convertSVGToBase64(svgContent)
  } catch (error) {
    return null
  }
}

export async function downloadRentalPDF(rental: Rental, logoUrl?: string) {
  const doc = await generateRentalPDF(rental, logoUrl)
  const fileName = `rental-agreement-${rental.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export function downloadAllRentalsPDF(rentals: Rental[]) {
  const doc = generateAllRentalsPDF(rentals)
  const fileName = `all-rentals-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export async function printRentalPDF(rental: Rental, logoUrl?: string) {
  const doc = await generateRentalPDF(rental, logoUrl)
  doc.autoPrint()
  doc.output('dataurlnewwindow')
}

export function printAllRentalsPDF(rentals: Rental[]) {
  const doc = generateAllRentalsPDF(rentals)
  doc.autoPrint()
  doc.output('dataurlnewwindow')
}

