import { parseBracketsToHtml } from './src/services/bracketService.js';
import fs from 'fs';

const outFile = 'repro_out_simple.txt';
const input = `[Cắt toàn bộ tuyến giáp hai bên/*Cắt một thùy Trái và eo tuyến giáp/Ngừng phẫu thuật và chờ kết quả giải phẫu bệnh thường]`;

try {
    const result = parseBracketsToHtml(input);
    const output = `Input: ${input}\nHTML: ${result.html}\nOptions: ${JSON.stringify(result.options, null, 2)}`;
    fs.writeFileSync(outFile, output);
    console.log('Written to ' + outFile);
} catch (e) {
    fs.writeFileSync(outFile, 'Error: ' + e.stack);
}
