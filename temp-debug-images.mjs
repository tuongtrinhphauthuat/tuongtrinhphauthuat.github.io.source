import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'

const buffer = readFileSync('sample.xlsx')
const workbook = XLSX.read(buffer, { type: 'buffer' })
const sheetName = 'Protocols'
const worksheet = workbook.Sheets[sheetName]
if (!worksheet) {
  console.error('Sheet not found')
  process.exit(1)
}
const data = XLSX.utils.sheet_to_json(worksheet, { defval: null })
const rows = data.length
console.log('rows:', rows)
console.log('cells with hyperlinks under Hình ảnh:')

const ref = worksheet['!ref']
const range = XLSX.utils.decode_range(ref)
const headerRow = range.s.r
const headers = new Map()
for (let c = range.s.c; c <= range.e.c; c++) {
  const addr = XLSX.utils.encode_cell({ r: headerRow, c })
  const cell = worksheet[addr]
  if (!cell) continue
  const raw = cell.w ?? cell.v
  if (raw) headers.set(XLSX.utils.encode_col(c), raw)
}

for (let r = headerRow + 1; r <= range.e.r; r++) {
  const col = 'C' // column C = Hình ảnh
  const addr = `${col}${r + 1}`
  const cell = worksheet[addr]
  if (!cell) continue
  if (!cell.l && !(cell.r && /hlink/i.test(JSON.stringify(cell.r)))) continue
  const rowIndex = r - headerRow
  const jsonRow = data[rowIndex - 1]
  const name = jsonRow?.['Tên'] || jsonRow?.name || ''
  console.log('---', addr, name)
  console.log('raw value:', jsonRow?.['Hình ảnh'])
  console.log('cell.l:', cell.l)
  if (cell.r) console.log('cell.r:', cell.r)
  if (cell.h) console.log('cell.h:', cell.h)
}
