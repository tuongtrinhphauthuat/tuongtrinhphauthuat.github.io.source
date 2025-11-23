console.log("Start");
import { parseBracketsToHtml } from './src/services/bracketService.js';
console.log("Imported");
const res = parseBracketsToHtml("[A/B]");
console.log("Result:", res.html);
console.log("Done");
