const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws);
data.slice(0, 3).forEach((row, idx) => {
  console.log(idx, row.__rowNum__, row.STT, row['Tên']);
});
