const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const idx = 34;
console.log(wb.Strings[idx]);
