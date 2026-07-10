let html = "Text $^ben$ and $ben$."
let v = { name: 'ben', choices: ['Trai', 'Phai'], selected: 0, id: '123' }

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// We MUST replace inverse FIRST because it has $^ben$ which contains $ben$
// If we replace $ben$ first, $^ben$ becomes $^<normal>$

const inverseToken = `\\$\\^${v.name}\\$`
html = html.replace(new RegExp(inverseToken, 'g'), "<inverse>")

const token = `\\$${v.name}\\$`
html = html.replace(new RegExp(token, 'g'), "<normal>")

console.log(html)
