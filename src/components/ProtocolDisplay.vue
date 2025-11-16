<template>
  <div class="protocols">
    <Sidebar
      :protocols="store.protocols"
      :selectedId="store.selectedId"
      @select="onSelect"
      @refresh="onRefresh"
      @open-edit="openEditLink"
      @open-settings="showSettings = true"
    />
    <div class="protocols__main">
      <ProtocolViewer :current="current" :loading="store.loading" :error="store.error" @copy="onCopy" />

      
    </div>

    <!-- settings modal -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="modal">
        <h3>Protocol source settings</h3>
        <label>Download (XLSX) URL</label>
        <input v-model="tmpSource" class="modal-input" />
        <label>Edit spreadsheet URL</label>
        <input v-model="tmpEdit" class="modal-input" />
        <div class="modal-actions">
          <button @click="saveSettings">Save & Load</button>
          <button @click="showSettings = false">Cancel</button>
        </div>
        <p class="modal-hint">Current download URL: <a :href="store.sourceUrl" target="_blank">open</a></p>
        <p class="modal-hint">Current edit URL: <a :href="store.editUrl" target="_blank">open</a></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useProtocolStore } from '../stores/protocolStore'
import Sidebar from './Sidebar.vue'
import ProtocolViewer from './ProtocolViewer.vue'

const store = useProtocolStore()

onMounted(() => {
  store.fetchProtocols()
})

function onSelect(item) {
  const id = item?.STT ?? item?.id ?? item?.['STT'] ?? item?.['Tên'] ?? null
  if (id != null) store.selectById(id)
}

const current = computed(() =>
  store.protocols.find((p) => String(p.STT ?? p.id ?? p['STT'] ?? p['Tên']) === String(store.selectedId)) || null
)

function onSave(updated) {
  store.updateProtocol(updated)
}

async function onCopy(text) {
  // The viewer already writes to clipboard; here we provide optional UI feedback point.
  console.log('Copied text length:', (text || '').length)
}

function onRefresh() {
  store.refresh()
}

function openEditLink() {
  try {
    const url = store.editUrl || ''
    if (url) window.open(url, '_blank')
  } catch (e) {
    console.error('openEditLink', e)
  }
}

const showSettings = ref(false)
const tmpSource = ref(store.sourceUrl)
const tmpEdit = ref(store.editUrl)

function saveSettings() {
  store.setSourceUrl(tmpSource.value || '')
  store.setEditUrl(tmpEdit.value || '')
  showSettings.value = false
  // reload data from new URL
  store.fetchProtocols(true)
}
</script>

<style scoped>
.protocols{display:flex;height:100vh;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial}
.protocols__sidebar{width:320px;padding:16px;border-right:1px solid rgba(16,24,40,.06);background:linear-gradient(180deg,#f8fafc,#fff);display:flex;flex-direction:column}
.protocols__search{margin-bottom:12px}
.protocols__input{width:100%;padding:10px;border-radius:8px;border:1px solid #e6eef8;background:#fff}
.protocols__list{list-style:none;margin:0;padding:0;overflow:auto}
.protocols__list-item{padding:8px 10px;border-radius:6px;margin-bottom:6px;cursor:pointer;background:transparent;text-align:left}
.protocols__list-item.is-selected{background:linear-gradient(90deg,#06b6d4 0%,#7c3aed 100%);color:#fff}
.protocols__content{flex:1;display:flex;flex-direction:column;padding:18px;background:#fff;text-align:left}
.protocols__topmenu{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.protocols__topmenu button{padding:8px 12px;border-radius:6px;border:1px solid #e3e8ef;background:#f8fafc;cursor:pointer}
.protocols__status{margin-left:auto;color:#64748b}
.protocols__editor{flex:1}
.protocols__editor-inner{display:flex;flex-direction:column;height:100%}
.protocols__title-selected{margin:0 0 12px 0}
.protocols__textarea{width:100%;height:100%;min-height:350px;border-radius:8px;border:1px solid #e6eef8;padding:12px;font-family:inherit;resize:vertical}
.protocols__empty{color:#475569;padding:30px;text-align:left}
.protocols__error{color:#b91c1c}

/* main container for right side to allow bottom bar placement */
.protocols__main{flex:1;display:flex;flex-direction:column;align-items:flex-start;text-align:left}
.protocols__bottombar{display:flex;gap:10px;padding:10px;border-top:1px solid rgba(16,24,40,.04);align-items:center}
.icon-btn{background:#fff;border:1px solid #e3e8ef;padding:8px;border-radius:8px;cursor:pointer}

/* settings modal */
.modal-overlay{position:fixed;inset:0;background:rgba(2,6,23,.5);display:flex;align-items:center;justify-content:center}
.modal{background:#fff;padding:18px;border-radius:8px;min-width:360px;max-width:90%}
.modal h3{margin-top:0}
.modal-input{width:100%;padding:8px;border:1px solid #e6eef8;border-radius:6px;margin-bottom:8px}
.modal-actions{display:flex;gap:8px;justify-content:flex-end}
.modal-hint{font-size:12px;color:#475569;margin-top:8px}
</style>