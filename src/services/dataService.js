import * as XLSX from 'xlsx'

export async function parseData(url) {
  try {
    const response = await fetch(url)
    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = 'Protocols'
    let worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      // fallback to first sheet
      const first = workbook.SheetNames && workbook.SheetNames[0]
      worksheet = workbook.Sheets[first]
    }
    const jsonData = XLSX.utils.sheet_to_json(worksheet)
  return jsonData
  } catch (error) {
    console.error('Error parsing XLSX:', error)
    return []
  }
}