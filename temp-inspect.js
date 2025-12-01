const XLSX = require(''xlsx'');
const wb = XLSX.readFile(''sample.xlsx'', { cellHTML: true, cellNF: true, cellText: true });
const ws = wb.Sheets[wb.SheetNames[0]];
[''C4'',''C5'',''C6'',''C7'',''C8'',''C9'',''C10'',''C11'',''C12''].forEach((c) => {
  const cell = ws[c];
  if (!cell) return;
  console.log(''---'', c, cell.t);
  console.log(''v:'', cell.v);
  console.log(''l:'', JSON.stringify(cell.l));
  console.log(''r:'', JSON.stringify(cell.r));
});
