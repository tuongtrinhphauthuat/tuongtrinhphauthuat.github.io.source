// Test to verify bracket parsing with default values
import { parseBracketsToHtml } from './src/services/bracketService.js'

// Test case from user's example
const testText = '[Cắt toàn bộ tuyến giáp hai bên/*Cắt một thùy Trái và eo tuyến giáp/Ngừng phẫu thuật và chờ kết quả giải phẫu bệnh thường]'

console.log('Testing bracket parsing with default selection...\n')
console.log('Input:', testText)
console.log('\n')

const result = parseBracketsToHtml(testText)

console.log('Parsed HTML:')
console.log(result.html)
console.log('\n')

console.log('Options:')
result.options.forEach((opt, idx) => {
    console.log(`Option ${idx}:`)
    console.log('  ID:', opt.id)
    console.log('  Type:', opt.type)
    console.log('  Choices:', opt.choices)
    console.log('  Selected index:', opt.selected)
    console.log('  Selected value:', opt.choices[opt.selected])
    console.log('')
})

// Parse the HTML to see what's actually displayed
const tempDiv = { innerHTML: result.html }
const textContent = result.html.replace(/<[^>]*>/g, '')
console.log('Visual text (tags stripped):', textContent)
