// Simple helper to parse bracket expressions and produce HTML markers
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInlineToHtml(str = '') {
  // preserve newlines and markdown-style bold (**text**)
  if (str == null) return ''
  const escaped = escapeHtml(String(str))
  // convert **bold** -> <strong>escaped</strong>
  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  // preserve newlines as <br>
  return bolded.replace(/\r\n|\r|\n/g, '<br>')
}

let idCounter = 1
function genId() {
  return `opt-${Date.now().toString(36)}-${idCounter++}`
}

/**
 * Parse raw text containing [bracket expressions] and return HTML with
 * non-editable spans as markers plus an options list describing each bracket.
 *
 * Rules:
 * - If bracket content contains '/', it is a multi-choice: split by '/'.
 * - If bracket content is a single phrase, it's treated as single-choice: choices ['Có','Không']
 *   where 'Có' means replace with the phrase, 'Không' means remove (we keep a placeholder span to preserve position).
 */
export function parseBracketsToHtml(rawText = '') {
  const options = []
  const varDefs = []
  const varMap = {}
  if (!rawText) return { html: '', options }

  // regex to find [ ... ] occurrences (non-greedy)
  const re = /\[([^\]]+)\]/g
  let lastIndex = 0
  let match
  let out = ''

  while ((match = re.exec(rawText)) !== null) {
    const before = rawText.slice(lastIndex, match.index)
    out += formatInlineToHtml(before)

  const inner = match[1].trim()
    const id = genId()
    // detect variable-definition pattern: [$name$=choices]
    // pattern: starts with $name$=...
    const varDefMatch = inner.match(/^\s*\$([^\$]+)\$\s*=\s*(.*)$/s)
    if (varDefMatch) {
      const varName = varDefMatch[1].trim()
      const rhs = varDefMatch[2].trim()
      // if var already defined, treat this bracket as a normal option (fall through to normal handling)
      if (!varMap[varName]) {
        // parse choices on RHS, reuse slash-escape logic
        const PLACEHOLDER = '<<SLASH_PLACEHOLDER_9f2c>>'
        const tmp = rhs.replace(/\/\//g, PLACEHOLDER)
        let choicesR = []
        if (tmp.includes('/')) {
          choicesR = tmp.split('/').map((s) => s.replace(new RegExp(PLACEHOLDER, 'g'), '/').trim()).filter(Boolean)
        } else {
          choicesR = [rhs]
        }
        const vid = genId()
  const vdef = { id: vid, name: varName, original: rhs, choices: choicesR, selected: 0 }
  varDefs.push(vdef)
  varMap[varName] = vdef
  // create a non-editable variable span at the original location so the definition position is replaced in the content
  const dataChoices = encodeURIComponent(JSON.stringify(choicesR || []))
  const display = vdef.choices[vdef.selected] ?? ''
  const spanHtml = `<span class="bracket-var" contenteditable="false" data-var-id="${vid}" data-var-name="${escapeHtml(varName)}" data-var-choices="${dataChoices}">${formatInlineToHtml(display)}</span>`
  out += spanHtml
  lastIndex = re.lastIndex
  continue
      }
      // if already defined, fallthrough to normal option handling
    }

    // decide choice set for regular brackets
    let choices = []
    let type = 'multi'
    if (inner.includes('/')) {
      // Support escaping a literal slash inside an option using double-slash: '//'
      // Rule: '//' inside brackets means a literal '/' and must NOT be treated as a separator.
      // Implementation: replace '//' with a temporary placeholder, split on single '/', then restore placeholder -> '/'.
      const PLACEHOLDER = '<<SLASH_PLACEHOLDER_9f2c>>'
      const tmp = inner.replace(/\/\//g, PLACEHOLDER)
      choices = tmp.split('/').map((s) => s.replace(new RegExp(PLACEHOLDER, 'g'), '/').trim()).filter(Boolean)
    } else {
      // single phrase -> two choices: Có (phrase) or Không (remove)
      choices = [inner]
      type = 'single'
    }

    // default label shown inside the non-editable span
  // For single-type where the user escaped slashes using '//', display a single '/' to the user.
  const displayOriginal = type === 'single' ? inner.replace(/\/\//g, '/') : (choices[0] || inner)

    // create option descriptor
    const opt = {
      id,
      type,
      original: inner,
      choices: type === 'single' ? ['Có', 'Không'] : choices,
      // for single, value mapping will be handled by ProtocolViewer
      selected: 0
    }
    options.push(opt)

    // data-choices contains encoded JSON of actual choice strings for multi
    const dataChoices = encodeURIComponent(JSON.stringify(type === 'single' ? [] : choices))

    // for single choice, we keep the span but show the phrase or an invisible placeholder when 'Không' is chosen
    // use zero-width space when empty so the span occupies position but appears removed
  // format label preserving bold/newlines (use displayOriginal for single-type to show single slash)
  const innerHtml = formatInlineToHtml(displayOriginal)

  out += `<span class="bracket-opt" contenteditable="false" data-opt-id="${id}" data-opt-type="${type}" data-opt-original="${escapeHtml(displayOriginal)}" data-opt-choices="${dataChoices}">${innerHtml}</span>`

    lastIndex = re.lastIndex
  }

  out += formatInlineToHtml(rawText.slice(lastIndex))

  // replace variable placeholders like $name$ in the composed HTML with non-editable spans
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')
  }

  let finalHtml = out
  if (varDefs.length) {
    varDefs.forEach((v) => {
      const token = `$${v.name}$`
      const display = v.choices[v.selected] ?? ''
      const dataChoices = encodeURIComponent(JSON.stringify(v.choices || []))
      const spanHtml = `<span class="bracket-var" contenteditable="false" data-var-id="${v.id}" data-var-name="${escapeHtml(v.name)}" data-var-choices="${dataChoices}">${formatInlineToHtml(display)}</span>`
      finalHtml = finalHtml.replace(new RegExp(escapeRegex(token), 'g'), spanHtml)
    })
  }

  return { html: finalHtml, options, varDefs }
}

/**
 * Given a container element (contenteditable root) and an option descriptor,
 * apply the selected choice by updating the corresponding span text.
 * For 'single' type and choice 'Không', we set a zero-width space so the marker stays.
 */
export function applyChoiceInDom(containerEl, optId, selectedIndex) {
  if (!containerEl) return
  const span = containerEl.querySelector(`[data-opt-id="${optId}"]`)
  if (!span) return

  const type = span.getAttribute('data-opt-type')
  if (type === 'single') {
    const original = span.getAttribute('data-opt-original') || ''
    if (selectedIndex === 0) {
      // Có -> show original phrase (format inline)
      span.innerHTML = formatInlineToHtml(original)
      span.classList.remove('bracket-empty')
    } else {
      // Không -> hide content but keep placeholder marker (zero-width space)
      span.innerHTML = '\u200B'
      span.classList.add('bracket-empty')
    }
  } else {
    // multi
    const json = span.getAttribute('data-opt-choices') || '%5B%5D'
    let choices = []
    try { choices = JSON.parse(decodeURIComponent(json)) } catch (e) { choices = [] }
    const val = choices[selectedIndex] ?? choices[0] ?? ''
    span.innerHTML = formatInlineToHtml(val)
    span.classList.remove('bracket-empty')
  }
}

export function applyVarChoiceInDom(containerEl, varName, selectedIndex, choices = []) {
  if (!containerEl) return
  const spans = containerEl.querySelectorAll(`[data-var-name]`)
  spans.forEach((s) => {
    if (s.getAttribute('data-var-name') === String(varName)) {
      const val = choices[selectedIndex] ?? choices[0] ?? ''
      s.innerHTML = formatInlineToHtml(val)
    }
  })
}

/** Replace literal $name$ tokens found in text nodes under containerEl with non-editable variable spans.
 * varDefs is an array of { id, name, choices, selected }
 */
export function replaceVarTokensInDom(containerEl, varDefs = []) {
  if (!containerEl || !varDefs || varDefs.length === 0) return

  // build quick map
  const map = {}
  varDefs.forEach((v) => { map[v.name] = v })

  // walk text nodes and replace occurrences
  const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null)
  const toProcess = []
  let node
  while ((node = walker.nextNode())) {
    toProcess.push(node)
  }

  toProcess.forEach((textNode) => {
    let text = textNode.nodeValue
    if (!text) return
    // check for any token in the text
    Object.keys(map).forEach((name) => {
      const token = `$${name}$`
      if (text.includes(token)) {
        // split by token and build nodes
        const parts = text.split(token)
        const frag = document.createDocumentFragment()
        parts.forEach((part, idx) => {
          if (part) frag.appendChild(document.createTextNode(part))
          if (idx !== parts.length - 1) {
            const def = map[name]
            const span = document.createElement('span')
            span.className = 'bracket-var'
            span.setAttribute('contenteditable', 'false')
            span.setAttribute('data-var-id', def.id)
            span.setAttribute('data-var-name', def.name)
            span.setAttribute('data-var-choices', encodeURIComponent(JSON.stringify(def.choices || [])))
            span.innerHTML = formatInlineToHtml(def.choices[def.selected] ?? '')
            frag.appendChild(span)
          }
        })
        textNode.parentNode.replaceChild(frag, textNode)
      }
    })
  })
}

/** Get current plain text (with choices applied) from container element. */
export function getPlainTextFromContainer(containerEl) {
  if (!containerEl) return ''

  // Clone to avoid modifying original DOM
  const clone = containerEl.cloneNode(true)
  const empties = clone.querySelectorAll('.bracket-empty')
  empties.forEach((s) => { s.textContent = '' })

  // Walk the clone and build text, inserting newlines for <br> and block-level elements
  function walk(node) {
    let out = ''
    node.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out += child.nodeValue
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName.toLowerCase()
        if (tag === 'br') {
          out += '\n'
        } else if (['p', 'div', 'section', 'li', 'tr', 'table', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
          // block element: recurse and add newline after
          out += walk(child)
          out += '\n'
        } else {
          out += walk(child)
        }
      }
    })
    return out
  }

  const text = walk(clone)
  // normalize consecutive newlines
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
}

export default { parseBracketsToHtml, applyChoiceInDom, applyVarChoiceInDom, getPlainTextFromContainer }
