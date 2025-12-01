const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
console.log(Object.keys(wb));
console.log('Strings length', wb.Strings?.length);
console.log('String 0', wb.Strings?.[0]);
