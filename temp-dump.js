const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { raw: false });
console.log(data.slice(0, 5));
