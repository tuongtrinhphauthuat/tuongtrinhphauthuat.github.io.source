const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const cell = ws['C9'];
console.log(cell);
console.log(Object.keys(cell));
