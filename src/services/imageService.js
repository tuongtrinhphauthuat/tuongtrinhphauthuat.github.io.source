const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg', '.tif', '.tiff', '.avif', '.heic']

function stripTrailingNoise(url) {
  let result = String(url || '').trim()
  while (result && /[)\].,;:!?'\"]$/.test(result)) {
    result = result.slice(0, -1)
  }
  return result
}

function stripQuotes(value = '') {
  const trimmed = String(value).trim()
  if (!trimmed.length) return ''
  const first = trimmed[0]
  const last = trimmed[trimmed.length - 1]
  if ((first === '"' || first === "'") && first === last) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

function extractLastSegment(url) {
  try {
    const parsed = new URL(url)
    const segments = parsed.pathname.split('/').filter(Boolean)
    return segments[segments.length - 1] || ''
  } catch (e) {
    const withoutQuery = url.split(/[?#]/)[0]
    const segments = withoutQuery.split('/').filter(Boolean)
    return segments[segments.length - 1] || ''
  }
}

export function isImageUrl(url) {
  if (!url) return false
  const cleaned = stripTrailingNoise(url)
  const base = cleaned.split(/[?#]/)[0]
  if (!base) return false
  const lower = base.toLowerCase()
  if (IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))) return true
  const lastSegment = extractLastSegment(cleaned)
  // Allow numeric-only segments (e.g. picsum.photos/200) or segments that look image-related
  if (/^\d+(x\d+)?$/i.test(lastSegment)) return true
  if (/^(?:img|image|photo|picture|pic)[-_]?/i.test(lastSegment)) return true
  return false
}

export function parseImageCondition(raw) {
  if (!raw) return null
  const text = String(raw).trim()
  const match = text.match(/^\$([^$]+)\$\s*(=|!=)\s*(.+)$/i)
  if (!match) return null
  const name = match[1].trim()
  const operator = match[2] === '!=' ? '!=' : '='
  const value = stripQuotes(match[3])
  if (!name || !value) return null
  return {
    type: 'variable',
    name,
    nameLower: name.toLowerCase(),
    operator,
    value,
    valueLower: value.toLowerCase()
  }
}

function collectConditions(fragment) {
  const list = []
  const pattern = /\[([^\]]+)\]/g
  let match
  while ((match = pattern.exec(fragment)) !== null) {
    const parsed = parseImageCondition(match[1])
    if (parsed) list.push(parsed)
  }
  return list
}

function cleanDescription(fragment) {
  const withoutConditions = fragment.replace(/\[[^\]]+\]/g, ' ')
  const condensed = withoutConditions.replace(/\s+/g, ' ').trim()
  return condensed.replace(/^[\-:.,\s]+/, '').replace(/[\-:.,\s]+$/, '')
}

export function extractImageEntry(line, { idPrefix = 'img', index = 0 } = {}) {
  if (!line) return null
  const source = String(line).trim()
  if (!source) return null
  const urlRegex = /https?:\/\/[\S]+/gi
  let match
  while ((match = urlRegex.exec(source)) !== null) {
    const rawUrl = match[0]
    const candidate = stripTrailingNoise(rawUrl)
    if (!isImageUrl(candidate)) continue
    const before = source.slice(0, match.index)
    const after = source.slice(match.index + rawUrl.length)
    const remainder = `${before} ${after}`
    const conditions = collectConditions(remainder)
    const description = cleanDescription(remainder)
    const id = `${idPrefix}-${index + 1}`
    return {
      id,
      url: candidate,
      description,
      conditions,
      raw: source
    }
  }
  return null
}

export function parseImageRows(raw, { idPrefix = 'img', startIndex = 0 } = {}) {
  if (!raw) return []
  const lines = String(raw)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
  const out = []
  lines.forEach((line, idx) => {
    const entry = extractImageEntry(line, { idPrefix, index: startIndex + idx })
    if (entry) out.push(entry)
  })
  return out
}

function equalsIgnoreCase(a, b) {
  if (a == null || b == null) return false
  return String(a).trim().localeCompare(String(b).trim(), undefined, { sensitivity: 'base' }) === 0
}

function matchesConditions(entry, varMap) {
  if (!entry.conditions || entry.conditions.length === 0) return true
  return entry.conditions.every(cond => {
    if (cond.type !== 'variable') return true
    const variable = varMap.get(cond.nameLower)
    if (!variable) return false
    const current = variable.value
    if (!current) return false
    if (cond.operator === '!=') {
      return !equalsIgnoreCase(current, cond.value)
    }
    return equalsIgnoreCase(current, cond.value)
  })
}

export function filterImagesByVariables(images = [], varDefs = []) {
  if (!Array.isArray(images) || images.length === 0) return []
  const varMap = new Map()
  if (Array.isArray(varDefs)) {
    varDefs.forEach(def => {
      if (!def || !def.name) return
      const key = String(def.name).toLowerCase()
      const value = def?.choices?.[def.selected] ?? def?.choices?.[0] ?? ''
      varMap.set(key, { value })
    })
  }
  return images.filter(entry => matchesConditions(entry, varMap))
}
