import { getPlainTextFromContainer } from './src/services/bracketService.js'

let html = `<div>Dòng 1</div><br><div></div><br><div>Dòng 2</div>`
const jsdom = await import('jsdom')
const dom = new jsdom.JSDOM(html)
global.Node = dom.window.Node
console.log(getPlainTextFromContainer(dom.window.document.body))
