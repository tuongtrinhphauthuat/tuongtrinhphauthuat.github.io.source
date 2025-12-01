import * as XLSX from 'xlsx';
import fs from 'node:fs';

const data = fs.readFileSync('sample.xlsx');
const wb = XLSX.read(data, { type: 'buffer', bookFiles: true });
const shared = wb.files['xl/sharedStrings.xml'];
const text = shared.content.toString('utf8');
console.log(text.includes('hlinkClick'));
