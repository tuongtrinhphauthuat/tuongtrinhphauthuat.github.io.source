import { parseBracketsToHtml } from "./src/services/bracketService.js";

const raw = "Quyet dinh: Cat thuy [$thuy$=tren/duoi/giua] phoi $thuy$.";
const parsed = parseBracketsToHtml(raw);
console.log(parsed.varDefs);
console.log(parsed.html);
