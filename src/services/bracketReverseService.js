// Convert rendered editor HTML (with .bracket-opt and .bracket-var spans)
// back to the original bracket/source representation.

function decodeHtmlEntities(str) {
  if (!str) return ''
  const txt = document.createElement('textarea')
  txt.innerHTML = str
  return txt.value
}

function escapeSlashForOutput(s) {
  return String(s).replace(/\//g, '//')
}

/**
 * Convert a container element or HTML string back to original bracket source.
 * - For `.bracket-opt` spans:
 *   - if `data-opt-type="single"` -> output `[original]` where original is data-opt-original (unescaped)
 *   - if multi -> reconstruct `[choice1/choice2]` (choices with '/' escaped as '//')
 * - For `.bracket-var` spans -> output `$name$` token.
 *
 * Accepts either an Element or a string of HTML. Returns plain text string.
 */
export function htmlToSource(input) {
  let root
  if (!input) return ''
  if (typeof input === 'string') {
    const d = document.createElement('div')
    d.innerHTML = input
    root = d
  } else if (input.nodeType) {
    // clone so we don't mutate original
    root = input.cloneNode(true)
  } else {
    return ''
  }

  // replace bracket-opt spans with their bracket text
  const opts = Array.from(root.querySelectorAll('.bracket-opt'))
  opts.forEach((span) => {
    try {
      const type = span.getAttribute('data-opt-type') || ''
      if (type === 'single') {
        const originalEscaped = span.getAttribute('data-opt-original') || ''
        // originalEscaped was escapeHtml(displayOriginal) when generated; decode it
        const decoded = decodeHtmlEntities(originalEscaped)
        const textNode = document.createTextNode('[' + decoded + ']')
        span.parentNode.replaceChild(textNode, span)
      } else {
        const json = span.getAttribute('data-opt-choices') || '%5B%5D'
        let choices = []
        try { choices = JSON.parse(decodeURIComponent(json)) } catch (e) { choices = [] }
        // escape any real slashes in choices using '//' to match parser's encoding
        const out = choices.map((c) => escapeSlashForOutput(c)).join('/')
        const textNode = document.createTextNode('[' + out + ']')
        span.parentNode.replaceChild(textNode, span)
      }
    } catch (e) {
      // fallback: remove span
      const t = document.createTextNode(span.textContent || '')
      span.parentNode.replaceChild(t, span)
    }
  })

  // replace var spans with $name$ tokens
  const vars = Array.from(root.querySelectorAll('.bracket-var'))
  vars.forEach((v) => {
    try {
      const name = v.getAttribute('data-var-name') || ''
      const textNode = document.createTextNode('$' + name + '$')
      v.parentNode.replaceChild(textNode, v)
    } catch (e) {
      const t = document.createTextNode(v.textContent || '')
      v.parentNode.replaceChild(t, v)
    }
  })

  // After replacements, return plain text with tags converted as text
  // Walk nodes and produce text, preserving <br> as newline
  function walk(node) {
    let out = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) out += child.nodeValue
      else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child.tagName && child.tagName.toLowerCase() === 'br') out += '\n'
        else out += walk(child)
      }
    })
    return out
  }

  const result = walk(root)
  return result
}

export default { htmlToSource }
