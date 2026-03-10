import draftService from './draftService'
import { useProtocolStore } from '../stores/protocolStore'

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
  // Clear all drafts
  draftsOnly()
  // Clear all edited flags (hard reset)
  try {
    const store = useProtocolStore()
    if (store && typeof store.clearAllEditedFlags === 'function') {
      store.clearAllEditedFlags()
    }
  } catch (err) {
    console.warn('Unable to clear edited flags', err)
  }
  // Clear other persisted settings
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      STORAGE_KEYS.forEach((key) => window.localStorage.removeItem(key))
      // Also explicitly remove the edited flags key if it exists
      window.localStorage.removeItem('protocols_edited_flags')
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
