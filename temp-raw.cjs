const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const opts = { raw: true, defval: null };
const data = XLSX.utils.sheet_to_json(ws, opts);
console.log(data[2]['Hình ảnh']);
