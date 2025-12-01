const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx', { bookFiles: true });
console.log(wb.Workbook.Sheets);
