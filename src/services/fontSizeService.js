import { ref } from 'vue'

const STORAGE_KEY = 'protocol_fontSize'
const DEFAULT_SIZE = 15
const MIN_SIZE = 12
const MAX_SIZE = 24

function clampSize(value) {
  if (Number.isNaN(value)) return DEFAULT_SIZE
  return Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(value)))
}

function readStoredSize() {
  if (typeof window === 'undefined' || !window.localStorage) return DEFAULT_SIZE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const num = raw ? Number(raw) : DEFAULT_SIZE
    return clampSize(num)
  } catch (err) {
    console.warn('Unable to read stored font size', err)
    return DEFAULT_SIZE
  }
}

function persistSize(value) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value))
  } catch (err) {
    console.warn('Unable to persist font size', err)
  }
}

function applyToDocument(value) {
  if (typeof document === 'undefined') return
  document.documentElement.style.fontSize = `${value}px`
  document.documentElement.style.setProperty('--app-font-size', `${value}px`)
}

const currentSize = ref(readStoredSize())

function setFontSize(value) {
  const next = clampSize(value)
  currentSize.value = next
  applyToDocument(next)
  persistSize(next)
  return next
}

function increment(delta = 1) {
  return setFontSize(currentSize.value + delta)
}

const presets = [
  { id: 'small', labelKey: 'fontSizePresetSmall', value: 14 },
  { id: 'medium', labelKey: 'fontSizePresetMedium', value: 16 },
  { id: 'large', labelKey: 'fontSizePresetLarge', value: 18 }
]

function applyPreset(presetId) {
  const preset = presets.find((p) => p.id === presetId)
  if (!preset) return currentSize.value
  return setFontSize(preset.value)
}

// Ensure the initial value is reflected on first import
applyToDocument(currentSize.value)

export default {
  currentSize,
  min: MIN_SIZE,
  max: MAX_SIZE,
  setFontSize,
  increment,
  presets,
  applyPreset
}
