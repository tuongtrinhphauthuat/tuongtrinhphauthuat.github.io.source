<template>
  <div class="protocols">
    <Sidebar :protocols="store.protocols" :selectedId="store.selectedId" @select="onSelect" @refresh="onRefresh"
      @open-edit="openEditLink" @open-settings="showSettings = true" />
    <div class="protocols__main">
      <ProtocolViewer ref="viewerRef" :current="current" :loading="store.loading" :error="store.error"
        :draftHtml="viewerContentOverride" @copy="onCopy" @edited="onEdited" @reset="onViewerReset" />

      <LoadingProgress v-if="store.loading" />

      <div v-if="versionPopoverVisible" ref="versionPopoverRef" class="versions-popover" :style="{ left: versionPopoverX + 'px', top: versionPopoverY + 'px' }" @mouseenter="clearVersionPopoverHideTimer" @mouseleave="versionPopoverVisible = false">
        <ul style="list-style:none;padding:6px;margin:0;display:flex;flex-direction:column;gap:6px;max-height:320px;overflow:auto">
          <li style="font-size:13px;color:#475569;padding:6px 0">
            <button class="icon-btn" @click.prevent="restoreEditingFromPopover">Phiên bản đang chỉnh sửa: <strong style="color:#0f172a">{{ draftHtmlForViewer ? 'Draft' : 'Current' }}</strong></button>
          </li>
          <li v-for="(v, idx) in currentVersions" :key="v.ts" style="display:flex;gap:8px;align-items:center">
            <div style="flex:1;text-align:left">
              <button class="icon-btn" style="width:100%;text-align:left;background:transparent;border:none;padding:6px 8px;" @click.prevent="previewVersionFromPopover(idx)">
                <div style="font-size:13px;color:#0f172a;">#{{ idx + 1 }} — {{ v.title || ('Saved ' + new Date(v.ts).toLocaleString()) }}</div>
                <div style="font-size:12px;color:#64748b;max-height:3rem;overflow:hidden">{{ (v.text || '').slice(0, 140) }}</div>
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- bottom menu moved here -->
      <div class="protocols__bottombar">
        <button class="icon-btn" @click="doCopy">Copy</button>
        <button class="icon-btn" @click="copySource">Copy source</button>
        <button class="icon-btn" @click="saveVersionNow">Save version</button>
        <button class="icon-btn" @click="openVersionsModal">Versions</button>
        <label style="display:flex;align-items:center;gap:8px;margin-left:8px">
          Autosave:
          <select v-model.number="autosaveInterval">
            <option :value="0">Off</option>
            <option :value="5">5s</option>
            <option :value="10">10s</option>
            <option :value="20">20s</option>
            <option :value="60">60s</option>
          </select>
        </label>
        <button class="icon-btn" @click="toggleFullscreen">{{ isFullscreen ? 'Exit Full' : 'Full screen' }}</button>
        <div style="margin-left:auto;color:#64748b">{{ versionsStatus }}</div>
      </div>

      <!-- versions modal -->
      <div v-if="showVersions" class="modal-overlay" @click.self="closeVersionsModal">
        <div class="modal">
          <h3>Saved versions</h3>
          <div v-if="currentVersions.length === 0">No saved versions for this protocol.</div>
          <ul v-else
            style="max-height:40vh;overflow:auto;list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px">
            <li v-for="(v, idx) in currentVersions" :key="v.ts" style="display:flex;gap:8px;align-items:center">
              <div style="flex:1">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div style="font-size:14px;font-weight:600;color:#0f172a">{{ v.title || ('Saved ' + new
                    Date(v.ts).toLocaleString()) }}</div>
                  <div style="font-size:12px;color:#475569">{{ new Date(v.ts).toLocaleString() }}</div>
                </div>
                <div style="font-size:13px;max-height:5rem;overflow:hidden;color:#0f172a;margin-top:6px">{{
                  (v.text || '').slice(0, 300) }}</div>
              </div>
              <div style="display:flex;gap:6px;align-items:center">
                <button class="icon-btn" @click.prevent="restoreVersion(v)">Preview</button>
                <button class="icon-btn" @click.prevent="applyVersionToProtocol(v)">Apply</button>
                <button class="icon-btn" @click.prevent="renameVersion(v)">Rename</button>
                <button class="icon-btn" :disabled="v.locked" @click.prevent="deleteVersion(v)">Delete</button>
                <button class="icon-btn" @click.prevent="toggleLockVersion(v)">{{ v.locked ? '🔒' : '🔓' }}</button>
              </div>
            </li>
          </ul>
          <div class="modal-actions"
            style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end;align-items:center">
            <button class="icon-btn" @click.prevent="deleteAllVersions">Delete all (except locked)</button>
            <button @click="closeVersionsModal">Close</button>
          </div>
        </div>
      </div>
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
import { computed, onMounted, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useProtocolStore } from '../stores/protocolStore'
import Sidebar from './Sidebar.vue'
import ProtocolViewer from './ProtocolViewer.vue'
import { htmlToSource } from '../services/bracketReverseService'
import LoadingProgress from './LoadingProgress.vue'

const store = useProtocolStore()
const viewerRef = ref(null)
// draftHtml used when restoring a saved version into the viewer without writing back to store
const draftHtmlForViewer = ref(null)
// viewerContentOverride is used to force-update the viewer (e.g. restoring a version)
const viewerContentOverride = ref(null)
const previewIndex = ref(null)
const versionPopoverVisible = ref(false)
const versionPopoverX = ref(0)
const versionPopoverY = ref(0)
const versionPopoverType = ref(null)
const versionPopoverRef = ref(null)
let versionPopoverHideTimer = null

// tracking last saved version content to avoid duplicate saves when navigating
const lastSavedVersionHtml = ref(null)
const lastSavedVersionAt = ref(0)
const savingNow = ref(false)
const suppressAutosave = ref(false)
let suppressAutosaveTimer = null

function setSuppressAutosave(ms = 800) {
  suppressAutosave.value = true
  if (suppressAutosaveTimer) clearTimeout(suppressAutosaveTimer)
  suppressAutosaveTimer = setTimeout(() => {
    suppressAutosave.value = false
    suppressAutosaveTimer = null
  }, ms)
}

function clearVersionPopoverHideTimer() {
  if (versionPopoverHideTimer) {
    clearTimeout(versionPopoverHideTimer)
    versionPopoverHideTimer = null
  }
}

// versioning state
const versionsMap = ref({}) // { [id]: [versions] }
const showVersions = ref(false)
const currentVersions = ref([])
const versionsStatus = ref('')
const isFullscreen = ref(false)
const autosaveInterval = ref(20) // seconds, 0 = off
const autosaveTimerId = ref(null)
const lastAutosaveHtml = ref(null)
const dirtyMap = ref({}) // track dirty per id
const draftsMap = ref({}) // { [id]: html } - persistent drafts

onMounted(() => {
  store.fetchProtocols()
  // load versions from localStorage on mount
  const raw = localStorage.getItem('protocol_versions_v1')
  try {
    versionsMap.value = raw ? JSON.parse(raw) : {}
    // normalize versions to ensure locked field exists (default false)
    Object.keys(versionsMap.value || {}).forEach((k) => {
      const arr = versionsMap.value[k]
      if (Array.isArray(arr)) {
        arr.forEach((vv) => { if (vv && typeof vv.locked === 'undefined') vv.locked = false })
      }
    })
  } catch (e) {
    versionsMap.value = {}
  }

  // load drafts from localStorage
  const rawDrafts = localStorage.getItem('protocol_drafts_v1')
  try {
    draftsMap.value = rawDrafts ? JSON.parse(rawDrafts) : {}
  } catch (e) {
    draftsMap.value = {}
  }

  // start autosave if enabled
  startAutosave()
})

onBeforeUnmount(() => {
  stopAutosave()
})

function onSelect(item) {
  const id = item?.STT ?? item?.id ?? item?.['STT'] ?? item?.['Tên'] ?? null
  if (id != null) store.selectById(id)
}

function doCopy() {
  try {
    if (viewerRef.value && viewerRef.value.copyEditor) viewerRef.value.copyEditor()
  } catch (e) {
    console.error('doCopy failed', e)
  }
}

  async function copySource() {
    try {
      let html = ''
      if (viewerRef.value && viewerRef.value.getEditorHtml) html = viewerRef.value.getEditorHtml()
      const src = htmlToSource(html || '')
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(src)
      } else {
        const ta = document.createElement('textarea')
        ta.value = src
        document.body.appendChild(ta)
        ta.select()
        try { document.execCommand('copy') } catch (e) {}
        ta.remove()
      }
      versionsStatus.value = 'Source copied'
    } catch (e) {
      console.error('copySource failed', e)
      versionsStatus.value = 'Copy failed'
    }
  }

function onViewerReset() {
  // clear any override and call viewer reset
  viewerContentOverride.value = null
  draftHtmlForViewer.value = null
  try {
    if (viewerRef.value && viewerRef.value.reset) viewerRef.value.reset()
  } catch (e) {
    console.error('viewer reset failed', e)
  }
  // Also remove any saved draft for the currently selected protocol so reset takes effect
  try {
    const id = store.selectedId ? String(store.selectedId) : null
    if (id && draftsMap.value && Object.prototype.hasOwnProperty.call(draftsMap.value, id)) {
      delete draftsMap.value[id]
      try { localStorage.setItem('protocol_drafts_v1', JSON.stringify(draftsMap.value)) } catch (e) { console.error('failed persisting drafts', e) }
    }
  } catch (e) {
    console.error('failed clearing draft on reset', e)
  }
  versionsStatus.value = 'Reset to default (draft cleared)'
}

// Prev/Next version navigation removed per request

// Versions menu hover/callers removed (prev/next buttons deleted in viewer)

function previewVersionFromPopover(idx) {
  const v = currentVersions.value[idx]
  if (!v) return
  viewerContentOverride.value = null
  nextTick(() => { viewerContentOverride.value = v.html })
  draftHtmlForViewer.value = v.html
  previewIndex.value = idx
  versionsStatus.value = `Previewing ${idx + 1}/${currentVersions.value.length}`
  versionPopoverVisible.value = false
}

function saveCurrentEditingAsVersion() {
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  if (savingNow.value) return
  savingNow.value = true
  try {
    // determine current html (draft or live)
    let html = draftHtmlForViewer.value
    try {
      if (!html && viewerRef.value && viewerRef.value.getEditorHtml) html = viewerRef.value.getEditorHtml()
    } catch (e) { }
    if (!html) return

    // avoid duplicate saves if same content was saved very recently
    const now = Date.now()
    if (lastSavedVersionHtml.value && lastSavedVersionHtml.value === html && (now - lastSavedVersionAt.value) < 5000) {
      return
    }
    const text = typeof html === 'string' ? html.replace(/<[^>]+>/g, '') : ''
    const arr = versionsMap.value[id] || []
    // if latest version already matches this content, do not duplicate
    if (arr.length > 0 && (arr[0].html === html || (arr[0].text && arr[0].text === text))) return
    const v = { ts: now, html, text, title: `Editing ${new Date(now).toLocaleString()}`, locked: false }
    arr.unshift(v)
    if (arr.length > 50) arr.splice(50)
    versionsMap.value[id] = arr
    try { localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value)) } catch (e) { console.error(e) }
    loadVersionsForCurrent()
    versionsStatus.value = `Saved current editing version`
    // update last-saved tracking and sync lastAutosaveHtml to avoid autosave duplication
    lastSavedVersionHtml.value = html
    lastSavedVersionAt.value = now
    try { lastAutosaveHtml.value = html } catch (e) { /* ignore */ }
  } finally {
    savingNow.value = false
  }
}

function restoreEditingFromPopover() {
  // restore the current draft into viewer (without applying to store)
  if (!draftHtmlForViewer.value) {
    // if no draft exists, try to read current editor html
    try {
      if (viewerRef.value && viewerRef.value.getEditorHtml) draftHtmlForViewer.value = viewerRef.value.getEditorHtml()
    } catch (e) { /* ignore */ }
  }
  viewerContentOverride.value = null
  nextTick(() => {
    viewerContentOverride.value = draftHtmlForViewer.value
  })
  if (draftHtmlForViewer.value) versionsStatus.value = 'Restored draft'
  versionPopoverVisible.value = false
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

// handle edited drafts emitted from ProtocolViewer
function onEdited(payload) {
  // Receive edited drafts from viewer; don't create a version immediately.
  // We keep the latest draft and mark it dirty; autosave timer will persist periodically.
  if (!payload || !payload.id) return
  draftHtmlForViewer.value = payload.html
  const id = String(payload.id)
  dirtyMap.value[id] = true

  // Save to draftsMap and persist to localStorage
  draftsMap.value[id] = payload.html
  try {
    localStorage.setItem('protocol_drafts_v1', JSON.stringify(draftsMap.value))
  } catch (e) {
    console.error('Failed to save drafts', e)
  }

  // update small status to indicate unsaved draft
  versionsStatus.value = `(unsaved draft) ${id}`
}

function loadVersionsForCurrent() {
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) {
    currentVersions.value = []
    versionsStatus.value = ''
    return
  }
  currentVersions.value = versionsMap.value[id] || []
  versionsStatus.value = `${currentVersions.value.length} version(s)`
}

watch(() => store.selectedId, () => {
  // clear draftHtml when switching and load versions list
  draftHtmlForViewer.value = null
  viewerContentOverride.value = null
  loadVersionsForCurrent()

  // Check for existing draft
  const id = store.selectedId ? String(store.selectedId) : null
  if (id && draftsMap.value[id]) {
    // restore draft
    draftHtmlForViewer.value = draftsMap.value[id]
    viewerContentOverride.value = draftsMap.value[id]
    versionsStatus.value = `Restored draft`
  }

  // reset lastAutosaveHtml and restart autosave
  lastAutosaveHtml.value = null
  stopAutosave()
  startAutosave()
})

function saveVersionNow() {
  // Manual save: optionally ask user for title
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  let html = draftHtmlForViewer.value
  try {
    if (!html && viewerRef.value && viewerRef.value.getEditorHtml) html = viewerRef.value.getEditorHtml()
  } catch (e) {
    // ignore
  }
  let text = ''
  if (html && typeof html === 'string') text = html.replace(/<[^>]+>/g, '')
  const now = Date.now()
  // ask for a title for better identification
  let title = prompt('Enter a title for this version (optional):', `Saved ${new Date(now).toLocaleString()}`)
  if (title === null) title = `Saved ${new Date(now).toLocaleString()}`
  const v = { ts: now, html, text, title, locked: false }
  const arr = versionsMap.value[id] || []
  // avoid saving duplicate content: if any previous version has same html or same text, skip
  if (arr.length > 0) {
    const exists = arr.some((x) => (x && (x.html === html || (x.text && x.text === text))))
    if (exists) {
      versionsStatus.value = 'No changes to save (duplicate of existing version)'
      return
    }
  }
  arr.unshift(v)
  if (arr.length > 50) arr.splice(50)
  versionsMap.value[id] = arr
  try {
    localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value))
  } catch (e) {
    console.error('save versions failed', e)
  }
  loadVersionsForCurrent()
  versionsStatus.value = `Saved`
}

function startAutosave() {
  stopAutosave()
  const sec = Number(autosaveInterval.value) || 0
  if (!sec || sec <= 0) return
  autosaveTimerId.value = setInterval(() => {
    autoSaveTick()
  }, sec * 1000)
}

function stopAutosave() {
  if (autosaveTimerId.value) {
    clearInterval(autosaveTimerId.value)
    autosaveTimerId.value = null
  }
}

async function autoSaveTick() {
  if (suppressAutosave.value) return
  if (savingNow.value) return
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  let html = draftHtmlForViewer.value
  try {
    if (!html && viewerRef.value && viewerRef.value.getEditorHtml) html = viewerRef.value.getEditorHtml()
  } catch (e) { }
  if (!html) return
  if (lastAutosaveHtml.value === html) return
  // perform autosave with a generated title
  const now = Date.now()
  const title = `Auto ${new Date(now).toLocaleTimeString()}`
  const text = html.replace(/<[^>]+>/g, '')
  const v = { ts: now, html, text, title, auto: true }
  // ensure lock flag exists on autosaves
  v.locked = false
  const arr = versionsMap.value[id] || []
  // avoid saving duplicate content for autosave: if any previous version has same html/text, skip
  if (arr.length > 0) {
    const exists = arr.some((x) => (x && (x.html === html || (x.text && x.text === text))))
    if (exists) {
      // nothing new compared to existing saved versions
      return
    }
  }
  arr.unshift(v)
  if (arr.length > 50) arr.splice(50)
  versionsMap.value[id] = arr
  try { localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value)) } catch (e) { console.error(e) }
  lastAutosaveHtml.value = html
  dirtyMap.value[id] = false
  loadVersionsForCurrent()
  versionsStatus.value = `Auto-saved ${arr.length} version(s)`
}

// watch autosaveInterval changes
watch(autosaveInterval, (nv) => {
  stopAutosave()
  startAutosave()
})

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
  // toggle class on main container
  const el = document.querySelector('.protocols__main')
  if (el) {
    if (isFullscreen.value) el.classList.add('editor-fullscreen')
    else el.classList.remove('editor-fullscreen')
  }
}

function openVersionsModal() {
  loadVersionsForCurrent()
  showVersions.value = true
}

function closeVersionsModal() {
  showVersions.value = false
}

function restoreVersion(v) {
  // set as draftHtml for viewer (preview). User can then apply to protocol using Apply button below.
  viewerContentOverride.value = null
  nextTick(() => {
    viewerContentOverride.value = v.html
  })
  draftHtmlForViewer.value = v.html
}

function applyVersionToProtocol(v) {
  // apply plain text to protocol content and save via store
  if (!store || !store.protocols) return
  const cur = current.value
  if (!cur) return
  const updated = { ...cur, ['Nội dung']: v.text || v.html || '' }
  onSave(updated)
  // close modal
  showVersions.value = false
}

function deleteVersion(v) {
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  const arr = versionsMap.value[id] || []
  const idx = arr.findIndex((x) => x.ts === v.ts)
  if (idx === -1) return
  // prevent deleting locked versions
  if (arr[idx] && arr[idx].locked) {
    alert('This version is locked and cannot be deleted.')
    return
  }
  if (!confirm('Delete this saved version?')) return
  arr.splice(idx, 1)
  versionsMap.value[id] = arr
  try { localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value)) } catch (e) { console.error(e) }
  loadVersionsForCurrent()
}

function toggleLockVersion(v) {
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  const arr = versionsMap.value[id] || []
  const idx = arr.findIndex((x) => x.ts === v.ts)
  if (idx === -1) return
  arr[idx].locked = !arr[idx].locked
  versionsMap.value[id] = arr
  try { localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value)) } catch (e) { console.error(e) }
  loadVersionsForCurrent()
}

function deleteAllVersions() {
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  const arr = versionsMap.value[id] || []
  // only delete versions that are not locked
  const deletable = arr.filter((x) => !x.locked)
  if (deletable.length === 0) {
    alert('No deletable versions found. Locked versions are preserved.')
    return
  }
  if (!confirm(`Delete ${deletable.length} version(s)? Locked versions will be kept.`)) return
  const remaining = arr.filter((x) => x.locked)
  versionsMap.value[id] = remaining
  try { localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value)) } catch (e) { console.error(e) }
  loadVersionsForCurrent()
}

function renameVersion(v) {
  const id = store.selectedId ? String(store.selectedId) : null
  if (!id) return
  const newTitle = prompt('Enter new title for version:', v.title || `Saved ${new Date(v.ts).toLocaleString()}`)
  if (newTitle === null) return
  const arr = versionsMap.value[id] || []
  const idx = arr.findIndex((x) => x.ts === v.ts)
  if (idx === -1) return
  arr[idx].title = newTitle
  versionsMap.value[id] = arr
  try { localStorage.setItem('protocol_versions_v1', JSON.stringify(versionsMap.value)) } catch (e) { console.error(e) }
  loadVersionsForCurrent()
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
.protocols {
  display: flex;
  height: 100%;
  width: 100%;
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, 'Helvetica Neue', Arial;
  overflow: hidden
}

.protocols__sidebar {
  width: 320px;
  padding: 16px;
  border-right: 1px solid rgba(16, 24, 40, .06);
  background: linear-gradient(180deg, #f8fafc, #fff);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0
}

.protocols__search {
  margin-bottom: 12px;
  flex-shrink: 0
}

.protocols__input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e6eef8;
  background: #fff
}

.protocols__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1
}

.protocols__list-item {
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  background: transparent;
  text-align: left
}

.protocols__list-item.is-selected {
  background: linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%);
  color: #fff
}

.protocols__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 18px;
  background: #fff;
  text-align: left;
  overflow: hidden;
  min-height: 0
}

.protocols__status {
  margin-left: auto;
  color: #64748b
}

.protocols__editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden
}

.protocols__editor-inner {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden
}

.protocols__title-selected {
  margin: 0 0 12px 0;
  flex-shrink: 0
}

.protocols__textarea {
  width: 100%;
  height: 100%;
  min-height: 350px;
  border-radius: 8px;
  border: 1px solid #e6eef8;
  padding: 12px;
  font-family: inherit;
  resize: vertical
}

.protocols__empty {
  color: #475569;
  padding: 30px;
  text-align: left
}

.protocols__error {
  color: #b91c1c
}

/* main container for right side to allow bottom bar placement */
.protocols__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
  --bottombar-height: 64px;
  overflow: hidden;
  position: relative;
  min-height: 0;
}

.protocols__main.editor-fullscreen {
  position: fixed;
  inset: 0;
  z-index: 99999;
  padding: 18px;
  background: #fff;
  display: flex;
  flex-direction: column
}

.protocols__main.editor-fullscreen .protocols__editor-content {
  height: 100vh;
  max-height: none
}

.protocols__bottombar {
  display: flex;
  gap: 10px;
  padding: 12px 16px 16px 16px;
  border-top: 1px solid rgba(16, 24, 40, .04);
  align-items: center;
  background: #fff;
  z-index: 20;
  min-height: var(--bottombar-height);
  box-shadow: 0 -2px 8px rgba(2, 6, 23, 0.04);
  flex-shrink: 0;
}

.icon-btn {
  background: #fff;
  border: 1px solid #e3e8ef;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer
}

/* settings modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, .5);
  display: flex;
  align-items: center;
  justify-content: center
  ;
  z-index: 100002;
}

.modal {
  background: #fff;
  padding: 18px;
  border-radius: 8px;
  min-width: 360px;
  max-width: 90%
}

.versions-popover {
  position: fixed;
  z-index: 100003;
  background: #fff;
  border: 1px solid #e6eef8;
  padding: 6px;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(2, 6, 23, .08);
  min-width: 220px;
  max-width: 360px;
}

.modal h3 {
  margin-top: 0
}

.modal-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #e6eef8;
  border-radius: 6px;
  margin-bottom: 8px
}

.modal-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end
}

.modal-hint {
  font-size: 12px;
  color: #475569;
  margin-top: 8px
}
</style>