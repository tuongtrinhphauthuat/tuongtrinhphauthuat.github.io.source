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

  // replace ... with an input span placeholder.
  // Wait, if it's already in contenteditable="true" div, we just need a styled span.
  // Let's use a class to make it look like an input and placeholder if empty.
  // However, the rule says: "Mặc định sẽ cho người dùng điền tay giá trị tại vị trí đó. Khi người dùng điền thì dấu ... Sẽ bị thay thế luôn."
  // If we just leave it as text `...`, when user types over it, it is replaced natively by contenteditable.
  // To make it explicit, we can wrap `...` in `<span class="bracket-input" contenteditable="true">...</span>`
  // Actually, since the container is already contenteditable, we can just style `...`? No, we need it to disappear completely when user types.
  // Let's wrap `...` in `<span class="bracket-input">...</span>`?

  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  let html = bolded.replace(/\r\n|\r|\n/g, '<br>')

  // Convert '...' into a span. We use zero-width spaces or something?
  // Let's just use `<span class="bracket-input">...</span>`. We will add logic in ProtocolViewer to clear it on focus/input.
  html = html.replace(/\.\.\./g, '<span class="bracket-input" tabindex="0">...</span>')

  return html
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
/**
 * Parse raw text containing [bracket expressions] and return HTML with
 * non-editable spans as markers plus an options list describing each bracket.
 *
 * Rules:
 * - If bracket content contains '/', it is a multi-choice: split by '/'.
 * - If bracket content is a single phrase, it's treated as single-choice.
 * - Supports nested brackets: [Outer [Inner 1/Inner 2]]
 * - Supports variable definitions: [$name$=Val1/Val2]
 */
export function parseBracketsToHtml(rawText = '', sourceInfo = null) {
  const options = []
  const varDefs = []
  const varMap = {}
  if (!rawText) return { html: '', options }

  // Helper to split string by separator but ignore separator inside brackets
  function splitBySeparator(str, sep) {
    if (!str.includes('[')) {
      return str.split(sep)
    }
    const parts = []
    let current = ''
    let depth = 0
    for (let i = 0; i < str.length; i++) {
      const char = str[i]
      if (char === '[') depth++
      else if (char === ']') {
        if (depth > 0) depth--
      }

      if (char === sep && depth === 0) {
        parts.push(current)
        current = ''
      } else {
        current += char
      }
    }
    parts.push(current)
    return parts
  }

  // Recursive function to parse text
  function parseText(text) {
    let resultHtml = ''
    let i = 0
    const len = text.length
    let textBuffer = ''

    const flushBuffer = () => {
      if (textBuffer) {
        resultHtml += formatInlineToHtml(textBuffer)
        textBuffer = ''
      }
    }

    while (i < len) {
      if (text[i] === '[') {
        // Check if this is a valid bracket block
        let depth = 1
        let j = i + 1
        let found = false
        while (j < len) {
          if (text[j] === '[') depth++
          else if (text[j] === ']') depth--

          if (depth === 0) {
            found = true
            break
          }
          j++
        }

        if (found) {
          flushBuffer()
          const inner = text.slice(i + 1, j).trim()
          const id = genId()

          // Check for variable definition: $name$=...
          // We need to be careful not to match $name$ inside a nested bracket if that's even possible
          // But variable definition should be at the start.
          const varDefMatch = inner.match(/^\s*\$([^\$]+)\$\s*=\s*(.*)$/s)

          if (varDefMatch) {
            const varName = varDefMatch[1].trim()
            const rhs = varDefMatch[2].trim()

            if (!varMap[varName]) {
              // Parse choices on RHS
              // Use splitBySeparator to handle nested slashes if any (though var defs usually simple)
              // But wait, var defs might contain brackets? Usually not, but let's be safe.
              // For now, assume var defs are simple text choices.
              // But if we want to support [Var=$v$=A/B], we need to be careful.
              // The original code supported // escaping.

              const PLACEHOLDER = '<<SLASH_PLACEHOLDER_9f2c>>'
              const tmp = rhs.replace(/\/\//g, PLACEHOLDER)
              let choicesR = []
              if (tmp.includes('/')) {
                choicesR = tmp
                  .split('/')
                  .map((s) => (s == null ? '' : s).replace(new RegExp(PLACEHOLDER, 'g'), '/').trim())
                  .filter((s) => s !== '')
              } else {
                choicesR = [rhs]
              }

              if (!choicesR.length) {
                const fallback = rhs.replace(/\/\//g, '/').trim()
                choicesR = [fallback || '']
              }

              // Detect defaults
              let selectedIndex = 0
              const starred = []
              choicesR = choicesR.map((c, idx) => {
                let v = c ?? ''
                let isStar = false
                if (v.startsWith('*')) { isStar = true; v = v.slice(1).trim() }
                if (v.endsWith('*')) { isStar = true; v = v.slice(0, -1).trim() }
                if (isStar) starred.push(idx)
                return v
              })
              if (starred.length >= 1) selectedIndex = starred[0]

              const vid = genId()
              const vdef = { id: vid, name: varName, original: rhs, choices: choicesR, selected: selectedIndex }
              varDefs.push(vdef)
              varMap[varName] = vdef

              const dataChoices = encodeURIComponent(JSON.stringify(choicesR || []))
              const display = vdef.choices[vdef.selected] ?? ''
              const spanHtml = `<span class="bracket-var" contenteditable="false" data-var-id="${vid}" data-var-name="${escapeHtml(varName)}" data-var-choices="${dataChoices}">${formatInlineToHtml(display)}</span>`
              resultHtml += spanHtml

              i = j + 1
              continue
            }
          }

          // Regular bracket option
          // Split by '/' respecting nesting
          // Handle // escape
          const PLACEHOLDER = '<<SLASH_PLACEHOLDER_9f2c>>'
          // We can't just replace // globally because it might be inside a nested bracket?
          // Actually, splitBySeparator logic needs to handle escaping too?
          // Let's simplify: First replace // with placeholder, then split by / respecting brackets.
          // But wait, if we replace // with placeholder, we might break structure if // was inside something?
          // No, // is just text.

          const innerEscaped = inner.replace(/\/\//g, PLACEHOLDER)
          const rawChoices = splitBySeparator(innerEscaped, '/')

          let choices = rawChoices
            .map((s) => (s == null ? '' : s).replace(new RegExp(PLACEHOLDER, 'g'), '/').trim())
            .filter((s) => s !== '')

          if (!choices.length) {
            // Fall back to the original inner text so we never pass undefined further down
            const fallback = inner.replace(/\/\//g, '/').trim()
            choices = [fallback || '']
          }

          let type = 'multi'
          let selectedIndex = undefined

          if (choices.length > 1) {
            // Multi choice
            const starred = []
            choices = choices.map((c, idx) => {
              let v = c ?? ''
              let isStar = false
              if (v.startsWith('*')) { isStar = true; v = v.slice(1).trim() }
              if (v.endsWith('*')) { isStar = true; v = v.slice(0, -1).trim() }
              if (isStar) starred.push(idx)
              return v
            })
            if (starred.length > 0) selectedIndex = starred[0]
          } else {
            // Single choice
            type = 'single'
            let phrase = choices[0]
            if (!phrase) {
              phrase = inner.replace(/\/\//g, '/').trim()
            }
            let isHidden = false
            if (phrase.startsWith('*')) { isHidden = true; phrase = phrase.slice(1).trim() }
            choices = [phrase]
            if (isHidden) selectedIndex = 1 // 0=Show, 1=Hide
          }

          // Detect variable reference in this option: $name$
          // Note: This is a top-level check. If $name$ is deep inside, we might still want to know?
          // The original code checked `inner.match(/\$([^\$]+)\$/)`.
          let varRef = null
          const varRefMatch = inner.match(/\$([^\$]+)\$/)
          if (varRefMatch) varRef = varRefMatch[1].trim()

          const opt = {
            id,
            type,
            original: inner, // Store original inner text for reconstruction
            choices: type === 'single' ? ['Hiện', 'Không hiện'] : choices,
            selected: selectedIndex !== undefined ? selectedIndex : 0,
            varRef
          }
          options.push(opt)

          const dataChoices = encodeURIComponent(JSON.stringify(type === 'single' ? [] : choices))

          // For display, we need to parse the selected choice content!
          // This is the recursive part.
          // The selected choice might contain nested brackets or variables.
          // We need to render the selected choice to HTML.

          let displayContent = ''
          if (type === 'single') {
            // For single, choices[0] is the text.
            // If selected is 0 (Show), we render choices[0].
            // If selected is 1 (Hide), we render placeholder (handled by CSS/JS usually, but here we render content)
            // Wait, the original logic:
            // if (isHidden) { selectedIndex = 1 }
            // displayOriginal = choices[0]
            // innerHtml = formatInlineToHtml(displayOriginal)
            // It seems it renders the text anyway?
            // No, `applyChoiceInDom` handles the hiding.
            // But initially?
            // "For single choice, we keep the span but show the phrase or an invisible placeholder when 'Không' is chosen"

            // We should render the content of the phrase recursively.
            const phrase = choices[0]
            // We need to parse this phrase recursively to handle nested brackets inside it!
            const parsedPhrase = parseText(phrase)
            displayContent = parsedPhrase
          } else {
            // Multi
            const selectedIdx = selectedIndex !== undefined ? selectedIndex : 0
            const val = choices[selectedIdx] || choices[0]
            console.log(`[bracketService ${id}] Multi-choice debug:`, { inner, choices, selectedIdx, val })
            displayContent = parseText(val)
            console.log(`[bracketService ${id}] displayContent after parseText:`, displayContent)
          }

          const refAttr = varRef ? ` data-opt-ref-var="${escapeHtml(varRef)}"` : ''

          // Note: data-opt-original stores the raw inner text.
          // When we swap options, we might need to re-parse the new option?
          // Yes! `applyChoiceInDom` needs to handle this.

          const spanHtml = `<span class="bracket-opt" tabindex="0" contenteditable="false" data-opt-id="${id}" data-opt-type="${type}" data-opt-original="${escapeHtml(inner)}" data-opt-choices="${dataChoices}"${refAttr}>${displayContent}</span>`
          console.log(`[bracketService ${id}] Final spanHtml for multi:`, { id, type, displayContent: displayContent.substring(0, 100), fullSpan: spanHtml.substring(0, 200) })
          resultHtml += spanHtml

          i = j + 1
          continue
        }
      }

      textBuffer += text[i]
      i++
    }
    flushBuffer()
    return resultHtml
  }

  let finalHtml = parseText(rawText)

  // Replace variable placeholders $name$ in the composed HTML
  // This is for variables that are NOT inside brackets (global text)
  // But wait, `parseText` handles brackets. What about $var$ in plain text?
  // The original code did `replaceVarTokensInDom` or similar at the end.
  // Here we can do it on the final string or let the DOM handler do it.
  // The original code did:
  // `finalHtml = finalHtml.replace(new RegExp(escapeRegex(token), 'g'), spanHtml)`
  // We should preserve this behavior.

  function escapeRegex(str) {
    // Escape regex special chars so literal tokens like $var$ are matched everywhere
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  if (varDefs.length) {
    varDefs.forEach((v) => {
      if (v.choices && v.choices.length > 0) {
        const inverseIdx = (v.selected + 1) % v.choices.length
        const inverseDisplay = v.choices[inverseIdx] ?? ''
        const dataChoices = encodeURIComponent(JSON.stringify(v.choices || []))
        const inverseSpanHtml = `<span class="bracket-var bracket-var-inverse" contenteditable="false" data-var-id="${v.id}" data-var-name="${escapeHtml(v.name)}" data-var-choices="${dataChoices}" data-var-inverse="true">${formatInlineToHtml(inverseDisplay)}</span>`
        finalHtml = finalHtml.replace(new RegExp(escapeRegex(`$^${v.name}$`), 'g'), inverseSpanHtml)
      }

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

  // Helper to re-parse content (we need to use the same parsing logic as initial load)
  // But we can't easily import parseBracketsToHtml here due to circular dependency if we are not careful.
  // Fortunately, we are in the same module.
  // We need to re-parse the *content* of the choice.

  if (type === 'single') {
    const originalEscaped = span.getAttribute('data-opt-original') || ''
    // Decode original to get the raw text
    const tmp = document.createElement('div')
    tmp.innerHTML = originalEscaped
    const rawOriginal = tmp.textContent || ''

    // If selectedIndex === 0 (Show), we show the content.
    // If selectedIndex === 1 (Hide), we show preview.

    if (selectedIndex === 0) {
      // Show: Parse the raw original text to HTML (handling nested brackets and variables)
      const parsed = parseBracketsToHtml(rawOriginal)
      span.innerHTML = parsed.html
      span.classList.remove('bracket-empty')
      return { options: parsed.options, varDefs: parsed.varDefs }
    } else {
      // Hide
      // Show preview
      // ... existing logic for preview ...
      // We need to handle variables in preview too.

      // Logic for preview:
      // `(ẩn) text`
      // If text contains `$var$`, we want to show the value of `$var$`.
      // The existing logic tries to do this.

      // I'll keep the existing preview logic but make it robust.
      span.classList.add('bracket-empty')
      const previewText = rawOriginal.replace(/\s+/g, ' ').trim()
      const safePreview = formatInlineToHtml(previewText)
      span.innerHTML = `<span class="bracket-empty-preview">(ẩn) ${safePreview}</span>`
      return { options: [], varDefs: [] }
    }
  } else {
    // Multi
    const json = span.getAttribute('data-opt-choices') || '%5B%5D'
    let choices = []
    try { choices = JSON.parse(decodeURIComponent(json)) } catch (e) { choices = [] }
    const val = choices[selectedIndex] ?? choices[0] ?? ''

    console.log(`[applyChoiceInDom ${optId}] Multi debug:`, { optId, selectedIndex, choices, val, currentHTML: span.innerHTML })

    // Parse the selected value!
    const parsed = parseBracketsToHtml(val)
    span.innerHTML = parsed.html
    span.classList.remove('bracket-empty')

    return { options: parsed.options, varDefs: parsed.varDefs }
  }
}


export function applyVarChoiceInDom(containerEl, varName, selectedIndex, choices = []) {
  if (!containerEl) return
  const spans = containerEl.querySelectorAll(`[data-var-name]`)
  spans.forEach((s) => {
    if (s.getAttribute('data-var-name') === String(varName)) {
      const val = choices[selectedIndex] ?? choices[0] ?? ''
      s.innerHTML = formatInlineToHtml(val)
      if (s.getAttribute('data-var-inverse') === 'true') {
        const inverseIdx = (selectedIndex + 1) % choices.length
        s.innerHTML = formatInlineToHtml(choices[inverseIdx] ?? '')
      }
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
        // visible state: replace token occurrences in the CURRENTLY DISPLAYED content with varHtml
        // The issue: we were using data-opt-original which contains ALL options,
        // but we should only replace variables in the CURRENTLY SELECTED option!

        // Get the current innerHTML (which should be the selected option)
        const currentContent = opt.innerHTML || ''

        // Create a temporary div to extract text content from the HTML
        const tmp = document.createElement('div')
        tmp.innerHTML = currentContent
        const currentText = tmp.textContent || ''

        // If the current content contains the variable token, replace it
        if (currentText.includes(`$${varName}$`)) {
          const parts = currentText.split(`$${varName}$`)
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

  function processTokens(prefix, isInverse) {
    const walker = document.createTreeWalker(containerEl, NodeFilter.SHOW_TEXT, null)
    const toProcess = []
    let node
    while ((node = walker.nextNode())) {
      toProcess.push(node)
    }

    toProcess.forEach((textNode) => {
      let text = textNode.nodeValue
      if (!text) return
      Object.keys(map).forEach((name) => {
        const token = prefix.replace('VARNAME', name)
        if (text.includes(token)) {
          const parts = text.split(token)
          const frag = document.createDocumentFragment()
          parts.forEach((part, idx) => {
            if (part) frag.appendChild(document.createTextNode(part))
            if (idx !== parts.length - 1) {
              const def = map[name]
              const span = document.createElement('span')
              span.className = isInverse ? 'bracket-var bracket-var-inverse' : 'bracket-var'
              span.setAttribute('contenteditable', 'false')
              span.setAttribute('data-var-id', def.id)
              span.setAttribute('data-var-name', def.name)
              span.setAttribute('data-var-choices', encodeURIComponent(JSON.stringify(def.choices || [])))
              if (isInverse) {
                 span.setAttribute('data-var-inverse', 'true')
                 const inverseIdx = (def.selected + 1) % def.choices.length
                 span.innerHTML = formatInlineToHtml(def.choices[inverseIdx] ?? '')
              } else {
                 span.innerHTML = formatInlineToHtml(def.choices[def.selected] ?? '')
              }
              frag.appendChild(span)
            }
          })
          if (!textNode.parentNode) return
          textNode.parentNode.replaceChild(frag, textNode)
          text = '' // clear text so we don't double replace the same old string
        }
      })
    })
  }

  processTokens('$^VARNAME$', true)
  processTokens('$VARNAME$', false)
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
        } else if (child.classList && child.classList.contains('bracket-input')) {
          const txt = walk(child)
          out += (txt === '' ? '...' : txt)
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
  return text.replace(/\r\n/g, '\n').replace(/\n\s*\n/g, '\n').replace(/\n+/g, '\n').trim()
}

export default { parseBracketsToHtml, applyChoiceInDom, applyVarChoiceInDom, getPlainTextFromContainer }
