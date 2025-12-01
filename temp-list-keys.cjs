const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
console.log(Object.keys(ws).filter(k => k.startsWith('!')));
console.log(ws['!links']);
