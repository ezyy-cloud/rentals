import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Rental } from './supabase-types'

export function generateRentalPDF(rental: Rental) {
  const doc = new jsPDF()
  
  // Header
  doc.setFontSize(20)
  doc.text('Rental Agreement', 105, 20, { align: 'center' })
  
  // Company Info
  doc.setFontSize(12)
  doc.text('Ezyy Rentals', 20, 35)
  doc.setFontSize(10)
  doc.text('Rental Agreement Details', 20, 42)
  
  let yPos = 55
  
  // Rental Information
  doc.setFontSize(12)
  doc.text('Rental Information', 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  const rentalInfo = [
    ['Rental ID:', rental.id.substring(0, 8) + '...'],
    ['Date Created:', new Date(rental.created_at).toLocaleDateString()],
    ['Status:', rental.returned_date ? 'Returned' : 'Active'],
  ]
  
  rentalInfo.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, 20, yPos)
    yPos += 7
  })
  
  yPos += 5
  
  // Customer Information
  doc.setFontSize(12)
  doc.text('Customer Information', 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  if (rental.user) {
    const customerInfo = [
      ['Name:', `${rental.user.first_name} ${rental.user.last_name}`],
      ['Email:', rental.user.email],
      ['Phone:', rental.user.telephone],
      ['ID Number:', rental.user.id_number],
      ['Address:', rental.user.address],
    ]
    
    customerInfo.forEach(([label, value]) => {
      doc.text(`${label} ${value}`, 20, yPos)
      yPos += 7
    })
  } else {
    doc.text('Customer information not available', 20, yPos)
    yPos += 7
  }
  
  yPos += 5
  
  // Device Information
  doc.setFontSize(12)
  doc.text('Device Information', 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  if (rental.device) {
    const deviceInfo = [
      ['Device Name:', rental.device.name],
      ['Device Type:', rental.device.device_type?.name ?? 'N/A'],
      ['Condition:', rental.device.condition],
      ['Working State:', rental.device.working_state],
    ]
    
    deviceInfo.forEach(([label, value]) => {
      doc.text(`${label} ${value}`, 20, yPos)
      yPos += 7
    })
  } else {
    doc.text('Device information not available', 20, yPos)
    yPos += 7
  }
  
  yPos += 5
  
  // Rental Period
  doc.setFontSize(12)
  doc.text('Rental Period', 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  const periodInfo = [
    ['Start Date & Time:', new Date(rental.start_date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })],
    ['End Date & Time:', new Date(rental.end_date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })],
    ['Returned Date:', rental.returned_date ? new Date(rental.returned_date).toLocaleDateString() : 'Not returned'],
  ]
  
  periodInfo.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, 20, yPos)
    yPos += 7
  })
  
  yPos += 5
  
  // Financial Information
  doc.setFontSize(12)
  doc.text('Financial Information', 20, yPos)
  yPos += 10
  
  doc.setFontSize(10)
  const financialInfo = [
    ['Daily Rate:', `$${rental.rate.toFixed(2)}`],
    ['Deposit:', `$${rental.deposit.toFixed(2)}`],
    ['Total Paid:', `$${rental.total_paid.toFixed(2)}`],
  ]
  
  financialInfo.forEach(([label, value]) => {
    doc.text(`${label} ${value}`, 20, yPos)
    yPos += 7
  })
  
  // Accessories Table
  if (rental.accessories && rental.accessories.length > 0) {
    yPos += 10
    doc.setFontSize(12)
    doc.text('Accessories', 20, yPos)
    yPos += 10
    
    const accessoriesData = rental.accessories.map((ra) => [
      ra.accessory?.name ?? 'N/A',
      ra.quantity.toString(),
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Accessory', 'Quantity']],
      body: accessoriesData,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] },
      styles: { fontSize: 9 },
      margin: { left: 20, right: 20 },
    })
  }
  
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
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      105,
      doc.internal.pageSize.height - 5,
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

export function downloadRentalPDF(rental: Rental) {
  const doc = generateRentalPDF(rental)
  const fileName = `rental-${rental.id.substring(0, 8)}-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export function downloadAllRentalsPDF(rentals: Rental[]) {
  const doc = generateAllRentalsPDF(rentals)
  const fileName = `all-rentals-${new Date().toISOString().split('T')[0]}.pdf`
  doc.save(fileName)
}

export function printRentalPDF(rental: Rental) {
  const doc = generateRentalPDF(rental)
  doc.autoPrint()
  doc.output('dataurlnewwindow')
}

export function printAllRentalsPDF(rentals: Rental[]) {
  const doc = generateAllRentalsPDF(rentals)
  doc.autoPrint()
  doc.output('dataurlnewwindow')
}

