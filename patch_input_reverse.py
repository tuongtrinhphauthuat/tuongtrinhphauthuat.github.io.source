with open('src/services/bracketReverseService.js', 'r') as f:
    content = f.read()

# in htmlToSource
# We need to replace .bracket-input with its text content (or ... if empty)
# Actually, since .bracket-input is just a span and htmlToSource does a `walk` function that just gets textContent,
# If the span has text, it gets returned. If it's empty, we should output `...` maybe?
# The spec says "Khi người dùng điền thì dấu ... Sẽ bị thay thế luôn", which means if they didn't type anything, it remains `...`.
# So `getPlainTextFromContainer` and `htmlToSource` should convert empty `<span class="bracket-input"></span>` to `...`.

old_walk_h2s = """  function walk(node) {
    let out = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue
      else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName && child.tagName.toLowerCase() === 'br') out += '\\n'
        else out += walk(child)
      }
    })
    return out
  }"""

new_walk_h2s = """  function walk(node) {
    let out = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue
      else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName && child.tagName.toLowerCase() === 'br') {
          out += '\\n'
        } else if (child.classList && child.classList.contains('bracket-input')) {
          const txt = walk(child)
          out += (txt === '' ? '...' : txt)
        } else {
          out += walk(child)
        }
      }
    })
    return out
  }"""
content = content.replace(old_walk_h2s, new_walk_h2s)

with open('src/services/bracketReverseService.js', 'w') as f:
    f.write(content)

with open('src/services/bracketService.js', 'r') as f:
    content = f.read()

old_walk_bs = """  function walk(node) {
    let out = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.nodeValue
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase()
        if (tag === 'br') {
          out += '\\n'
        } else if (['p', 'div', 'section', 'li', 'tr', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          // block element: recurse and add newline after
          out += walk(child)
          out += '\\n'
        } else {
          out += walk(child)
        }
      }
    })
    return out
  }"""

new_walk_bs = """  function walk(node) {
    let out = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.nodeValue
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase()
        if (tag === 'br') {
          out += '\\n'
        } else if (child.classList && child.classList.contains('bracket-input')) {
          const txt = walk(child)
          out += (txt === '' ? '...' : txt)
        } else if (['p', 'div', 'section', 'li', 'tr', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          // block element: recurse and add newline after
          out += walk(child)
          out += '\\n'
        } else {
          out += walk(child)
        }
      }
    })
    return out
  }"""
content = content.replace(old_walk_bs, new_walk_bs)

with open('src/services/bracketService.js', 'w') as f:
    f.write(content)
