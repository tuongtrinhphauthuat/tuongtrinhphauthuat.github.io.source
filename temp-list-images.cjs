const XLSX = require('xlsx');
const wb = XLSX.readFile('sample.xlsx');
const ws = wb.Sheets[wb.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(ws, { raw: false });
data.forEach((row, idx) => {
  Object.keys(row).forEach(key => {
    if (key.toLowerCase().startsWith('hình ảnh') && row[key]) {
      console.log(`Row ${idx + 2} - ${key}`);
      console.log(row[key]);
      console.log('---');
    }
  });
});
