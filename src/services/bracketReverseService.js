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

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInlineToHtml(str = '') {
  if (str == null) return ''
  const escaped = escapeHtml(String(str))
  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  return bolded.replace(/\r\n|\r|\n/g, '<br>')
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
        // determine which choice is currently selected by comparing rendered HTML/text
        const currentHtml = span.innerHTML || ''
        const currentText = (span.textContent || '').trim()
        let sel = -1
        for (let i = 0; i < choices.length; i++) {
          const candidateHtml = formatInlineToHtml(choices[i])
          if (candidateHtml === currentHtml) { sel = i; break }
          // fallback compare plain text
          const tmp = document.createElement('div')
          tmp.innerHTML = candidateHtml
          if ((tmp.textContent || '').trim() === currentText) { sel = i; break }
        }
        if (sel === -1) sel = 0
        // escape any real slashes in choices using '//' to match parser's encoding
        const out = choices.map((c, idx) => {
          const esc = escapeSlashForOutput(c)
          return idx === sel ? (esc + '*') : esc
        }).join('/')
        const textNode = document.createTextNode('[' + out + ']')
        span.parentNode.replaceChild(textNode, span)
      }
    } catch (e) {
      // fallback: remove span
      const t = document.createTextNode(span.textContent || '')
      span.parentNode.replaceChild(t, span)
    }
  })

  // handle var spans: reconstruct a definition at first occurrence and tokens elsewhere
  const varSpans = Array.from(root.querySelectorAll('.bracket-var'))
  const varMap = {}
  varSpans.forEach((v) => {
    const name = v.getAttribute('data-var-name') || ''
    if (!varMap[name]) varMap[name] = []
    varMap[name].push(v)
  })
  // determine selected index for each var by inspecting first span
  const varSelected = {}
  Object.keys(varMap).forEach((name) => {
    const arr = varMap[name]
    if (!arr || arr.length === 0) return
    const first = arr[0]
    const json = first.getAttribute('data-var-choices') || '%5B%5D'
    let choices = []
    try { choices = JSON.parse(decodeURIComponent(json)) } catch (e) { choices = [] }
    let sel = -1
    const currentHtml = first.innerHTML || ''
    const currentText = (first.textContent || '').trim()
    for (let i = 0; i < choices.length; i++) {
      const candidateHtml = formatInlineToHtml(choices[i])
      if (candidateHtml === currentHtml) { sel = i; break }
      const tmp = document.createElement('div')
      tmp.innerHTML = candidateHtml
      if ((tmp.textContent || '').trim() === currentText) { sel = i; break }
    }
    if (sel === -1) sel = 0
    varSelected[name] = { sel, choices }
  })

  // now replace occurrences: first -> definition, others -> $name$
  Object.keys(varMap).forEach((name) => {
    const arr = varMap[name]
    const info = varSelected[name]
    arr.forEach((span, idx) => {
      try {
        if (!info || !info.choices || info.choices.length === 0) {
          const t = document.createTextNode('$' + name + '$')
          span.parentNode.replaceChild(t, span)
          return
        }
        if (idx === 0) {
          // build definition with '*' on selected
          const out = info.choices.map((c, i) => (i === info.sel ? escapeSlashForOutput(c) + '*' : escapeSlashForOutput(c))).join('/')
          const textNode = document.createTextNode('[$' + name + '$=' + out + ']')
          span.parentNode.replaceChild(textNode, span)
        } else {
          const t = document.createTextNode('$' + name + '$')
          span.parentNode.replaceChild(t, span)
        }
      } catch (e) {
        const t = document.createTextNode(span.textContent || '')
        span.parentNode.replaceChild(t, span)
      }
    })
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
