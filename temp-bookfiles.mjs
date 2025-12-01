import * as XLSX from 'xlsx';
import fs from 'node:fs';

const data = fs.readFileSync('sample.xlsx');
const wb = XLSX.read(data, { type: 'buffer', bookFiles: true });
console.log(Object.keys(wb.files || {}));
