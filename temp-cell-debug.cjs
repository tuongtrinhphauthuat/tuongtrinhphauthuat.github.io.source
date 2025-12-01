const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
['C4','C5','C6','C7','C8','C9','C10','C11','C12'].forEach(addr => {
  const cell = ws[addr];
  if (!cell) return;
  console.log('Cell', addr);
  console.log(cell);
});
