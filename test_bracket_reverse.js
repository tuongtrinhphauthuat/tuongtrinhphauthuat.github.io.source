import { htmlToSource } from './src/services/bracketReverseService.js'

let html = `Text [$ben$=Trái/Phải] <span class="bracket-var bracket-var-inverse" contenteditable="false" data-var-id="opt-mrf2wvut-3" data-var-name="ben" data-var-choices="%5B%22Tr%C3%A1i%22%2C%22Ph%E1%BA%A3i%22%5D" data-var-inverse="true">Phải</span> and <span class="bracket-var" contenteditable="false" data-var-id="opt-mrf2wvut-3" data-var-name="ben" data-var-choices="%5B%22Tr%C3%A1i%22%2C%22Ph%E1%BA%A3i%22%5D">Trái</span>.`
console.log(htmlToSource(html))
