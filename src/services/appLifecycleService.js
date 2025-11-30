import draftService from './draftService'

const STORAGE_KEYS = [
  'protocol_sourceUrl',
  'protocol_editUrl',
  'protocol_language',
  'protocol_fontSize'
]

function clearDraftsAndReload() {
  draftsOnly()
  reloadApp()
}

function resetAllLocalState() {
  draftsOnly()
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
    } catch (err) {
      console.warn('Unable to clear stored keys', err)
    }
  }
  reloadApp()
}

function draftsOnly() {
  try {
    draftService.clearAllDrafts()
  } catch (err) {
    console.error('Failed to clear drafts', err)
  }
}

function reloadApp() {
  if (typeof window === 'undefined') return
  window.location.reload()
}

export default {
  clearDraftsAndReload,
  resetAllLocalState
}
