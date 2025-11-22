<template>
  <div class="settings-overlay" @click.self="onClose">
    <div class="settings-box" role="dialog" aria-modal="true">
      <h3 class="settings-title">Protocol source settings</h3>

      <label class="settings-label">Download (XLSX) URL</label>
      <div class="settings-row">
        <input class="settings-link" readonly :value="localSource" @click="selectAll($event)" />
        <a class="settings-open" :href="localSource || '#'" target="_blank" v-if="localSource">Open</a>
      </div>

      <label class="settings-label">Edit spreadsheet URL</label>
      <div class="settings-row">
        <input class="settings-link" readonly :value="localEdit" @click="selectAll($event)" />
        <a class="settings-open" :href="localEdit || '#'" target="_blank" v-if="localEdit">Open</a>
      </div>

      <div class="settings-actions">
        <button class="btn" @click="onSave">Save & Load</button>
        <button class="btn btn-cancel" @click="onClose">Cancel</button>
      </div>
      <p class="settings-hint">Tip: click the URL field to select all text for easy copying.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
const props = defineProps({ source: { type: String, default: '' }, edit: { type: String, default: '' } })
const emit = defineEmits(['save', 'close'])

const localSource = ref(props.source || '')
const localEdit = ref(props.edit || '')

watch(() => props.source, (v) => (localSource.value = v || ''))
watch(() => props.edit, (v) => (localEdit.value = v || ''))

function selectAll(ev) {
  const el = ev.target
  if (el && typeof el.select === 'function') {
    el.select()
  }
}

function onSave() {
  emit('save', { source: localSource.value || '', edit: localEdit.value || '' })
}

function onClose() {
  emit('close')
}
</script>

<style scoped>
.settings-overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(2,6,23,0.45); z-index:100005 }
.settings-box { background:#fff; padding:18px; border-radius:8px; min-width:360px; max-width:90%; text-align:center; width: 60%; }
.settings-title { margin:0 0 12px 0 }
.settings-label { display:block; text-align:left; margin-top:8px; margin-bottom:6px; color:#334155 }
.settings-input { width:100%; padding:8px; border:1px solid #e6eef8; border-radius:6px; margin-bottom:6px }
.settings-row { display:flex; gap:8px; align-items:center; margin-bottom:8px }
.settings-link { flex:1; padding:8px; border:1px solid #e6eef8; border-radius:6px }
.settings-open { white-space:nowrap; color:#0369a1; text-decoration:none }
.settings-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:10px }
.btn { padding:8px 12px; border-radius:6px; border:1px solid #e6eef8; background:#fff; cursor:pointer }
.btn-cancel { background:#fff }
.settings-hint { margin-top:10px; color:#64748b; font-size:13px }
</style>
