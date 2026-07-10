import { parseBracketsToHtml } from './src/services/bracketService.js'
let html = "Text [$ben$=Trái/Phải] $^ben$ and $ben$."
console.log(parseBracketsToHtml(html).html)
