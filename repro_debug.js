import { parseBracketsToHtml } from './src/services/bracketService.js';
import fs from 'fs';
import path from 'path';

const outFile = path.resolve('repro_out.txt');
console.log('Writing to', outFile);

function log(msg) {
    fs.appendFileSync(outFile, msg + '\n');
    console.log(msg);
}

try {
    fs.writeFileSync(outFile, 'Starting repro...\n');

    const input = `[Cắt toàn bộ tuyến giáp hai bên/*Cắt một thùy Trái và eo tuyến giáp/Ngừng phẫu thuật và chờ kết quả giải phẫu bệnh thường]`;
    log('Input: ' + input);

    const result = parseBracketsToHtml(input);
    log('HTML: ' + result.html);
    log('Options: ' + JSON.stringify(result.options, null, 2));

    const input2 = `[A/B]`;
    log('Input2: ' + input2);
    const result2 = parseBracketsToHtml(input2);
    log('HTML2: ' + result2.html);
    log('Options2: ' + JSON.stringify(result2.options, null, 2));

} catch (e) {
    log('Error: ' + e.message + '\n' + e.stack);
}
