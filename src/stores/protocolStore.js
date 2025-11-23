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
        const v = p.versions.find(v => v.title === oldTitle)
        if (v) {
          v.title = newTitle
        }
      }
    }
  }
})