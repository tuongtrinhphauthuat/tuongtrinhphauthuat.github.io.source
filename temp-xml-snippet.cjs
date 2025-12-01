const fs = require('fs');
const xml = fs.readFileSync('sample_xlsx/xl/worksheets/sheet1.xml', 'utf8');
const match = xml.match(/<c r="C9"[\s\S]*?<\/c>/);
console.log(match ? match[0] : 'not found');
