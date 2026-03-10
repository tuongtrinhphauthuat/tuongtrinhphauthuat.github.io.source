import { defineStore } from 'pinia'
import { parseData } from '../services/versionService'

const DEFAULT_SOURCE_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzes4RqQG9_fHLEz6WxVGtSzQ6AT7AIhD0hjClhvhvfVrpJcAHJNgbvm2keqGApSv9Ze1NuAnmpdGl/pub?output=xlsx'
const DEFAULT_EDIT_URL =
  'https://docs.google.com/spreadsheets/d/1sdFKxiBouM8vdmkrgCabFuGFnb8t67HvVeNW2SS1GTw/edit?gid=0#gid=0'

export const useProtocolStore = defineStore('protocol', {
  state: () => ({
    protocols: [],
    loading: false,
    error: null,
    selectedId: null,
    selectedVersion: null,
    // persistable URLs
    sourceUrl: localStorage.getItem('protocol_sourceUrl') || DEFAULT_SOURCE_URL,
    editUrl: localStorage.getItem('protocol_editUrl') || DEFAULT_EDIT_URL
  }),
  actions: {
    async fetchProtocols(force = false) {
      try {
        if (!force && this.protocols.length) return
        this.loading = true
        this.error = null
        const parsed = await parseData(this.sourceUrl)
        this.protocols = Array.isArray(parsed) ? parsed : []

        // Restore persisted edited flags (if any)
        try {
          this._applyPersistedFlags && this._applyPersistedFlags()
        } catch (e) {
          // ignore
        }

        // Validate selectedId
        if (this.selectedId) {
          const exists = this.protocols.find(p => String(p.id) === String(this.selectedId) || String(p.stt) === String(this.selectedId))
          if (!exists) {
            this.selectedId = null
            this.selectedVersion = null
          }
        }

        if (this.protocols.length && !this.selectedId) {
          // default select first protocol
          const p = this.protocols[0]
          const id = p.stt ?? p.id ?? p.name ?? 0
          this.selectedId = String(id)
          this.selectedVersion = p.versions?.[0] || null
        }
      } catch (err) {
        this.error = err?.message || String(err)
        this.protocols = []
      } finally {
        this.loading = false
      }
    },

    refresh() {
      return this.fetchProtocols(true)
    },

    selectById(id, version = null) {
      this.selectedId = String(id)
      this.selectedVersion = version

      // If no version specified, default to first version of the protocol
      if (!version && this.selectedId) {
        const p = this.protocols.find(p => String(p.id) === String(id) || String(p.stt) === String(id))
        if (p && p.versions?.length) {
          this.selectedVersion = p.versions[0]
        }
      }
    },

    updateProtocol(updated) {
      // keep raw immutable by copying array and object
      const idx = this.protocols.findIndex(p => p.stt === updated.stt || p.id === updated.id)
      if (idx !== -1) {
        const copy = this.protocols.slice()
        copy[idx] = { ...copy[idx], ...updated }
        this.protocols = copy
      }
    },

    setSourceUrl(url) {
      this.sourceUrl = url
      try { localStorage.setItem('protocol_sourceUrl', url) } catch (e) { }
    },

    setEditUrl(url) {
      this.editUrl = url
      try { localStorage.setItem('protocol_editUrl', url) } catch (e) { }
    },

    updateVersionTitle(protocolId, oldTitle, newTitle) {
      const p = this.protocols.find(p => String(p.id) === String(protocolId) || String(p.stt) === String(protocolId))
      if (p && p.versions) {
        const v = p.versions.find(v => v.title === oldTitle || v.originalTitle === oldTitle || (v.id && v.title === oldTitle))
        if (v) {
          v.title = newTitle
          // If title changed, it's edited. If title reverted to original, check if content is also original?
          // For simplicity, we track title edit separately or just assume if title != originalTitle it is edited.
          // But we also want to track content edits.
          // Let's rely on the caller to manage the full isEdited state or just update title here.
          // We will update isEdited based on title change here, but OR it with existing isEdited (from content) might be safer?
          // For now, let's just check title difference.
          const titleChanged = v.title !== v.originalTitle
          // We don't want to clear isEdited if content is still modified.
          // So we should probably not overwrite isEdited to false if it was true, unless we know content is clean.
          // But here we only know about title.
          // Let's just set it if title changed. If title matches, we leave it alone (it might be true due to content).
          if (titleChanged) {
            v.isEdited = true
            try {
              const pid = p.stt ?? p.id
              this.markVersionAsEdited(pid, v.title, true)
            } catch (e) { }
          }
        }
      }
    },

    // persistence helpers for edited flags
    _editedFlagsKey() {
      return 'protocols_edited_flags'
    },

    _makeFlagKey(protocolId, v) {
      const vid = v && (v.id || v.originalTitle || v.title || '')
      return `${protocolId}::${vid}`
    },

    _loadEditedFlags() {
      try {
        const raw = localStorage.getItem(this._editedFlagsKey())
        return raw ? JSON.parse(raw) : {}
      } catch (e) {
        return {}
      }
    },

    _saveEditedFlags(map) {
      try {
        localStorage.setItem(this._editedFlagsKey(), JSON.stringify(map || {}))
      } catch (e) { }
    },

    _applyPersistedFlags() {
      try {
        const map = this._loadEditedFlags()
        if (!map || typeof map !== 'object') return
        if (!this.protocols || !this.protocols.length) return
        this.protocols.forEach((p) => {
          const pid = p.stt ?? p.id
          if (!p.versions) return
          p.versions.forEach((v) => {
            const key = this._makeFlagKey(pid, v)
            if (map.hasOwnProperty(key)) v.isEdited = !!map[key]
          })
        })
      } catch (e) { }
    },

    markVersionAsEdited(protocolId, versionTitle, isEdited) {
      const p = this.protocols.find(p => String(p.id) === String(protocolId) || String(p.stt) === String(protocolId))
      if (p && p.versions) {
        const v = p.versions.find(v => v.title === versionTitle || (v.originalTitle && v.originalTitle === versionTitle))
        if (v) {
          v.isEdited = isEdited
          try {
            const pid = p.stt ?? p.id
            const key = this._makeFlagKey(pid, v)
            const map = this._loadEditedFlags() || {}
            if (isEdited) map[key] = true
            else delete map[key]
            this._saveEditedFlags(map)
          } catch (e) { }
        }
      }
    },

    // Clear all edited flags for all versions across all protocols (Hard Reset)
    clearAllEditedFlags() {
      try {
        if (this.protocols && this.protocols.length) {
          this.protocols.forEach((p) => {
            if (p.versions && p.versions.length) {
              p.versions.forEach((v) => {
                v.isEdited = false
              })
            }
          })
        }
        // Clear the persisted flags map from localStorage
        this._saveEditedFlags({})
      } catch (e) {
        console.error('Error clearing edited flags', e)
      }
    }
  }
})