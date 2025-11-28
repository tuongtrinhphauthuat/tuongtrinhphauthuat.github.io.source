import { parseOverrideTokens, applyInheritanceOverrides } from "./src/services/inheritanceService.js";

const parent = "Nay [$thuy$=tren/duoi/giua] phoi $thuy$.";
const childSrc = "[$thuy$=duoi]";
const { overrides } = parseOverrideTokens(childSrc);
const result = applyInheritanceOverrides(parent, overrides);
console.log(result);
