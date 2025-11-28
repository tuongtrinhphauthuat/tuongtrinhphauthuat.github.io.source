const DIACRITIC_REGEX = /[\u0300-\u036f]/g
const SLASH_PLACEHOLDER = '__SLASH_ESC__'

function stripDiacritics(str = '') {
  return str.normalize('NFD').replace(DIACRITIC_REGEX, '')
}

export function normalizeContentKey(str = '') {
  return stripDiacritics(String(str))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

export function extractFirstNumber(str = '') {
  const match = String(str).match(/(\d+)/)
  return match ? match[1] : null
}

export function detectInheritanceDirective(rawText = '') {
  if (!rawText) return null
  const match = rawText.match(/^\s*\(\*\s*([^)]+)\)/)
  if (!match) return null
  const directiveBody = match[1].trim()
  const remainder = rawText.slice(match[0].length).trim()
  const normalized = normalizeContentKey(directiveBody)
  const numberMatch = normalized.match(/noidung(\d+)/)
  const parentNumber = numberMatch ? numberMatch[1] : null
  const parentKeyNormalized = numberMatch ? normalizeContentKey(`noi dung ${parentNumber}`) : null
  return {
    directiveRaw: match[0],
    directiveBody,
    parentNumber,
    parentKeyNormalized,
    overridesText: remainder
  }
}

function makeRangeTracker() {
  const ranges = []
  const overlaps = (start, end) => ranges.some(([s, e]) => Math.max(s, start) < Math.min(e, end))
  const add = (start, end) => ranges.push([start, end])
  return { overlaps, add, ranges }
}

export function parseOverrideTokens(text = '') {
  if (!text) return { overrides: [], leftoverText: '' }
  const overrides = []
  const tracker = makeRangeTracker()

  const pushOverride = (data) => overrides.push(data)

  const contextRegex = /\.\.(.*?)\[(.*?)\](.*?)\.\./gs
  let contextMatch
  while ((contextMatch = contextRegex.exec(text)) !== null) {
    const [full, prefix, value, suffix] = contextMatch
    const start = contextMatch.index
    const end = start + full.length
    if (tracker.overlaps(start, end)) continue
    tracker.add(start, end)
    pushOverride({
      type: 'context-bracket',
      prefix: prefix.trim(),
      value: value.trim(),
      suffix: suffix.trim(),
      position: start,
      raw: full
    })
  }

  const varRegex = /\[\s*\$([^$]+)\$\s*=\s*([^\]]+)\]/gs
  let varMatch
  while ((varMatch = varRegex.exec(text)) !== null) {
    const [full, name, rhs] = varMatch
    const start = varMatch.index
    const end = start + full.length
    if (tracker.overlaps(start, end)) continue
    tracker.add(start, end)
    pushOverride({
      type: 'var',
      name: name.trim(),
      value: rhs.trim(),
      position: start,
      raw: full
    })
  }

  const bracketRegex = /\[([^\[\]]+?)\]/gs
  let bracketMatch
  while ((bracketMatch = bracketRegex.exec(text)) !== null) {
    const [full, inner] = bracketMatch
    const start = bracketMatch.index
    const end = start + full.length
    if (tracker.overlaps(start, end)) continue
    const trimmed = inner.trim()
    if (/^\$[^$]+\$\s*=/.test(trimmed)) continue
    tracker.add(start, end)
    pushOverride({
      type: 'bracket',
      value: trimmed,
      position: start,
      raw: full
    })
  }

  overrides.sort((a, b) => a.position - b.position)
  const cleanOverrides = overrides.map(({ position, ...rest }) => rest)

  const leftoverPieces = []
  let cursor = 0
  const sortedRanges = tracker.ranges.sort((a, b) => a[0] - b[0])
  sortedRanges.forEach(([start, end]) => {
    if (cursor < start) leftoverPieces.push(text.slice(cursor, start))
    cursor = end
  })
  if (cursor < text.length) leftoverPieces.push(text.slice(cursor))
  const leftoverText = leftoverPieces.join('').trim()

  return { overrides: cleanOverrides, leftoverText }
}

function normalizeForCompare(str = '') {
  return stripDiacritics(String(str)).toLowerCase().replace(/[^a-z0-9]/g, '')
}

function splitChoices(inner = '') {
  const encoded = inner.replace(/\/\//g, SLASH_PLACEHOLDER)
  return encoded
    .split('/')
    .map((part) => part.replace(new RegExp(SLASH_PLACEHOLDER, 'g'), '/'))
}

function hasEdgeStar(str = '') {
  const trimmed = String(str).trim()
  return trimmed.startsWith('*') || trimmed.endsWith('*')
}

function stripStars(str = '') {
  let result = String(str)
  while (result.startsWith('*')) result = result.slice(1)
  while (result.endsWith('*')) result = result.slice(0, -1)
  return result.trim()
}

function escapeChoiceValue(str = '') {
  return str.replace(/\//g, '//')
}

function escapeRegExp(str = '') {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function setChoice(inner = '', desiredValue = '') {
  if (!inner) return null
  const parts = splitChoices(inner)
  if (!parts.length) return null
  const desiredStripped = stripStars(desiredValue)
  const desiredHasStar = hasEdgeStar(desiredValue)
  let targetIndex = -1
  const cleaned = parts.map((part, idx) => {
    const stripped = stripStars(part)
    if (targetIndex === -1 && normalizeForCompare(stripped) === normalizeForCompare(desiredStripped)) {
      targetIndex = idx
    }
    return {
      stripped,
      originalHadStar: hasEdgeStar(part)
    }
  })
  if (targetIndex === -1) return null
  const singleChoice = cleaned.length === 1

  return cleaned
    .map((part, idx) => {
      let candidate = part.stripped
      if (idx === targetIndex) {
        if (singleChoice) {
          const shouldHide = desiredHasStar || (!desiredValue && part.originalHadStar)
          candidate = shouldHide ? `*${candidate}` : candidate
        } else {
          candidate = `*${candidate}`
        }
      }
      return escapeChoiceValue(candidate)
    })
    .join('/')
}

function replaceRange(content, start, end, replacement) {
  return content.slice(0, start) + replacement + content.slice(end)
}

function findClosingBracket(content, openIndex) {
  let depth = 0
  for (let i = openIndex; i < content.length; i++) {
    const char = content[i]
    if (char === '[') depth++
    else if (char === ']') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

function applyVarOverride(content, override) {
  const { name, value } = override
  if (!name) return content
  const pattern = new RegExp(`\\[\\s*\\$\\s*${escapeRegExp(name)}\\s*\\$\\s*=([^\\]]+)\\]`, 'i')
  const match = pattern.exec(content)
  if (!match) return content
  const full = match[0]
  const innerStart = match.index ?? 0
  const replacementChoices = setChoice(match[1], value)
  if (!replacementChoices) return content
  const updated = `[$${name}$=${replacementChoices}]`
  return replaceRange(content, innerStart, innerStart + full.length, updated)
}

function findBracketOccurrences(content) {
  const stack = []
  const occurrences = []
  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    if (char === '[') {
      stack.push(i)
    } else if (char === ']') {
      const start = stack.pop()
      if (start != null) {
        occurrences.push({ start, end: i, inner: content.slice(start + 1, i) })
      }
    }
  }
  return occurrences.sort((a, b) => a.start - b.start)
}

function applyBracketOverride(content, override, usedStarts) {
  const occurrences = findBracketOccurrences(content)
  for (const occurrence of occurrences) {
    if (usedStarts.has(occurrence.start)) continue
    if (/^\s*\$[^$]+\$\s*=/.test(occurrence.inner)) continue
    const replacement = setChoice(occurrence.inner, override.value)
    if (!replacement) continue
    usedStarts.add(occurrence.start)
    return {
      content: replaceRange(content, occurrence.start, occurrence.end + 1, `[${replacement}]`),
      start: occurrence.start
    }
  }
  return { content }
}

function applyContextOverride(content, override, usedStarts) {
  const prefix = override.prefix ? override.prefix.toLowerCase() : ''
  const suffix = override.suffix ? override.suffix.toLowerCase() : ''
  const lowerContent = content.toLowerCase()
  let cursor = 0
  while (cursor < content.length) {
    const prefixIndex = prefix ? lowerContent.indexOf(prefix, cursor) : cursor
    if (prefix && prefixIndex === -1) break
    const searchStart = prefix ? prefixIndex + prefix.length : cursor
    const suffixIndex = suffix ? lowerContent.indexOf(suffix, searchStart) : content.length
    if (suffix && suffixIndex === -1) break
    const openIndex = content.indexOf('[', searchStart)
    if (openIndex === -1 || openIndex > suffixIndex) {
      cursor = prefixIndex + 1
      continue
    }
    const closeIndex = findClosingBracket(content, openIndex)
    if (closeIndex === -1 || closeIndex > suffixIndex) {
      cursor = prefixIndex + 1
      continue
    }
    if (usedStarts.has(openIndex)) {
      cursor = prefixIndex + 1
      continue
    }
    const inner = content.slice(openIndex + 1, closeIndex)
    const replacement = setChoice(inner, override.value)
    if (!replacement) {
      cursor = prefixIndex + 1
      continue
    }
    usedStarts.add(openIndex)
    return {
      content: replaceRange(content, openIndex, closeIndex + 1, `[${replacement}]`),
      start: openIndex
    }
  }
  return applyBracketOverride(content, override, usedStarts)
}

export function applyInheritanceOverrides(baseContent = '', overrides = []) {
  if (!baseContent || !Array.isArray(overrides) || overrides.length === 0) {
    return baseContent
  }
  let content = baseContent
  const usedStarts = new Set()
  overrides.forEach((override) => {
    if (override.type === 'var') {
      content = applyVarOverride(content, override)
      return
    }
    if (override.type === 'context-bracket') {
      const result = applyContextOverride(content, override, usedStarts)
      content = result.content
      return
    }
    if (override.type === 'bracket') {
      const result = applyBracketOverride(content, override, usedStarts)
      content = result.content
    }
  })
  return content
}
