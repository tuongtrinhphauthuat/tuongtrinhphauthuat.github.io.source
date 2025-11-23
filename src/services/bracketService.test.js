import fs from 'fs';

async function runTests() {
    fs.writeFileSync('test_output.txt', 'Running bracketService tests...\n');

    try {
        const { parseBracketsToHtml } = await import('./bracketService.js');

        // Test 1: Nested brackets
        fs.appendFileSync('test_output.txt', 'Test 1: Nested Brackets\n');
        const nestedInput = '[Outer [Inner 1/Inner 2]]';
        const nestedResult = parseBracketsToHtml(nestedInput);
        fs.appendFileSync('test_output.txt', 'Nested Result HTML: ' + nestedResult.html + '\n');

        // Test 2: Variable in option
        fs.appendFileSync('test_output.txt', 'Test 2: Variable in Option\n');
        const varInput = 'Variable: $myvar$';
        const optInput = '[Option with $myvar$]';
        const varResult = parseBracketsToHtml(optInput);
        fs.appendFileSync('test_output.txt', 'Var Result HTML: ' + varResult.html + '\n');
        fs.appendFileSync('test_output.txt', 'Var Result Options: ' + JSON.stringify(varResult.options, null, 2) + '\n');

        // Test 3: User Repro
        fs.appendFileSync('test_output.txt', 'Test 3: User Repro\n');
        const reproInput = `[Cắt toàn bộ tuyến giáp hai bên/*Cắt một thùy Trái và eo tuyến giáp/Ngừng phẫu thuật và chờ kết quả giải phẫu bệnh thường]`;
        const reproResult = parseBracketsToHtml(reproInput);
        fs.appendFileSync('test_output.txt', 'Repro HTML: ' + reproResult.html + '\n');
        fs.appendFileSync('test_output.txt', 'Repro Options: ' + JSON.stringify(reproResult.options, null, 2) + '\n');


    } catch (e) {
        fs.appendFileSync('test_output.txt', 'Error: ' + e.stack + '\n');
    }
}

runTests();
