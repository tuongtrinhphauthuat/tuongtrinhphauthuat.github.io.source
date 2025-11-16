import { defineStore } from 'pinia'
import { parseData } from '../services/dataService'

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
        if (this.protocols.length && !this.selectedId) {
          // default select first protocol
          const id = this.protocols[0].STT ?? this.protocols[0].id ?? this.protocols[0]['Tên'] ?? 0
          this.selectedId = String(id)
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

    selectById(id) {
      this.selectedId = String(id)
    },

    updateProtocol(updated) {
      // keep raw immutable by copying array and object
      const idx = this.protocols.findIndex(p => p.STT === updated.STT || p.id === updated.id)
      if (idx !== -1) {
        const copy = this.protocols.slice()
        copy[idx] = { ...copy[idx], ...updated }
        this.protocols = copy
      }
    },

    setSourceUrl(url) {
      this.sourceUrl = url
      try { localStorage.setItem('protocol_sourceUrl', url) } catch (e) {}
    },

    setEditUrl(url) {
      this.editUrl = url
      try { localStorage.setItem('protocol_editUrl', url) } catch (e) {}
    }
  }
})