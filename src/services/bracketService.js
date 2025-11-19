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
      // single phrase -> two choices: Hiện (show phrase) or Không hiện (hide)
      choices = [inner]
      type = 'single'
    }

    // default label shown inside the non-editable span
  // For single-type where the user escaped slashes using '//', display a single '/' to the user.
  const displayOriginal = type === 'single' ? inner.replace(/\/\//g, '/') : (choices[0] || inner)

    // create option descriptor
    // detect if this single/multi option references a variable token like $name$
    let varRef = null
    const varRefMatch2 = inner.match(/\$([^\$]+)\$/)
    if (varRefMatch2) varRef = varRefMatch2[1].trim()

    const opt = {
      id,
      type,
      original: inner,
      // single -> Hiện / Không hiện; multi -> actual choices array
      choices: type === 'single' ? ['Hiện', 'Không hiện'] : choices,
      selected: 0,
      varRef
    }
    options.push(opt)

    // data-choices contains encoded JSON of actual choice strings for multi
    const dataChoices = encodeURIComponent(JSON.stringify(type === 'single' ? [] : choices))

    // for single choice, we keep the span but show the phrase or an invisible placeholder when 'Không' is chosen
    // use zero-width space when empty so the span occupies position but appears removed
  // format label preserving bold/newlines (use displayOriginal for single-type to show single slash)
  const innerHtml = formatInlineToHtml(displayOriginal)

    // include an attribute referencing the linked variable (if present) so DOM updates can sync
    const refAttr = varRef ? ` data-opt-ref-var="${escapeHtml(varRef)}"` : ''
    out += `<span class="bracket-opt" contenteditable="false" data-opt-id="${id}" data-opt-type="${type}" data-opt-original="${escapeHtml(displayOriginal)}" data-opt-choices="${dataChoices}"${refAttr}>${innerHtml}</span>`

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
    const originalEscaped = span.getAttribute('data-opt-original') || ''
    const varRef = span.getAttribute('data-opt-ref-var')
    // helper to find variable span html
    function findVarHtml(name) {
      if (!name) return ''
      const vs = containerEl.querySelector(`[data-var-name="${name}"]`)
      return vs ? vs.innerHTML : ''
    }

    if (selectedIndex === 0) {
      // Hiện -> show original phrase; if original contains $var$ token, replace it with current var HTML
      if (varRef) {
        // originalEscaped was escapeHtml(displayOriginal). Decode to plain text
        const tmp = document.createElement('div')
        tmp.innerHTML = originalEscaped
        const decoded = tmp.textContent || ''
        const parts = decoded.split(`$${varRef}$`)
        const frag = document.createDocumentFragment()
        parts.forEach((part, idx) => {
          if (part) frag.appendChild(document.createTextNode(part))
          if (idx !== parts.length - 1) {
            const wrapper = document.createElement('div')
            wrapper.innerHTML = findVarHtml(varRef) || ''
            Array.from(wrapper.childNodes).forEach((n) => frag.appendChild(n.cloneNode(true)))
          }
        })
        // replace span contents
        span.innerHTML = ''
        span.classList.remove('bracket-empty')
        span.appendChild(frag)
      } else {
        span.innerHTML = formatInlineToHtml(originalEscaped)
        span.classList.remove('bracket-empty')
      }
    } else {
      // Không hiện -> show a muted preview of the original phrase (data-opt-original).
      // If the original references a variable token ($name$), substitute the current var HTML into the preview.
      try {
        const tmp2 = document.createElement('div')
        tmp2.innerHTML = originalEscaped
        const decoded = tmp2.textContent || ''
        let previewHtml = ''
        if (varRef) {
          const varHtml = findVarHtml(varRef) || ''
          const parts = decoded.split(`$${varRef}$`)
          previewHtml = parts.map((p, idx) => escapeHtml(p) + (idx !== parts.length - 1 ? varHtml : '')).join('')
        } else {
          previewHtml = escapeHtml(decoded)
        }
        span.innerHTML = `<span class="bracket-empty-preview">(ẩn) ${previewHtml}</span>`
        span.classList.add('bracket-empty')
      } catch (e) {
        span.innerHTML = '\u200B'
        span.classList.add('bracket-empty')
      }
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

  // Also update any bracket-opt that references this var via data-opt-ref-var
  // iterate all bracket-opt spans and refresh those that reference this var
  try {
    const list = containerEl.querySelectorAll('.bracket-opt')
    list.forEach((opt) => {
      const ref = opt.getAttribute('data-opt-ref-var')
      if (!ref) return
      if (ref !== String(varName)) return
      const varHtml = (containerEl.querySelector(`[data-var-name="${varName}"]`) || { innerHTML: '' }).innerHTML
      if (opt.classList.contains('bracket-empty')) {
        // currently hidden state -> show muted preview of the original phrase (with var substitution)
        try {
          const originalEscaped2 = opt.getAttribute('data-opt-original') || ''
          const tmp3 = document.createElement('div')
          tmp3.innerHTML = originalEscaped2
          const decoded2 = tmp3.textContent || ''
          const parts2 = decoded2.split(`$${varName}$`)
          const preview2 = parts2.map((p, idx) => escapeHtml(p) + (idx !== parts2.length - 1 ? varHtml : '')).join('')
          opt.innerHTML = `<span class="bracket-empty-preview">(ẩn) ${preview2}</span>`
        } catch (e) {
          const safeHtml2 = varHtml || ''
          opt.innerHTML = `<span class="bracket-empty-preview">(ẩn) ${safeHtml2}</span>` || '\u200B'
        }
      } else {
        // visible state: replace token occurrences in original attribute with varHtml
        const originalEscaped = opt.getAttribute('data-opt-original') || ''
        const tmp = document.createElement('div')
        tmp.innerHTML = originalEscaped
        const decoded = tmp.textContent || ''
        const parts = decoded.split(`$${varName}$`)
        const frag = document.createDocumentFragment()
        parts.forEach((part, idx) => {
          if (part) frag.appendChild(document.createTextNode(part))
          if (idx !== parts.length - 1) {
            const wrapper = document.createElement('div')
            wrapper.innerHTML = varHtml || ''
            Array.from(wrapper.childNodes).forEach((n) => frag.appendChild(n.cloneNode(true)))
          }
        })
        opt.innerHTML = ''
        opt.appendChild(frag)
      }
    })
  } catch (e) {
    // ignore selector errors and bail
  }
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
