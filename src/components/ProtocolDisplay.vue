<template>
  <div class="protocols">
    <Sidebar :protocols="store.protocols" :selectedId="store.selectedId" :selectedVersion="store.selectedVersion"
      @select="onSelect" @refresh="onRefresh" @open-edit="openEditLink" @open-settings="showSettings = true" />
    <div id="display-main-container" class="protocols__main">
      <ProtocolViewer id="display-viewer-wrapper" ref="viewerRef" :current="current"
        :selectedVersion="store.selectedVersion" :loading="store.loading" :error="store.error"
        :draftHtml="viewerContentOverride" @copy="onCopy" @edited="onEdited" @reset="onViewerReset"
        @toggle-fullscreen="toggleFullscreen" />

      <LoadingProgress v-if="store.loading" />

      <!-- version popover removed -->

      <!-- bottom menu moved here -->
      <div id="display-bottom-bar" class="display__bottombar">
        <button id="display-btn-copy" class="icon-btn" @click="doCopy" :title="t('copy')">{{ t('copy') }}</button>
        <button id="display-btn-copy-source" class="icon-btn" @click="copySource" :title="t('copySource')">{{
          t('copySource') }}</button>
        <!-- manual save/version/autosave UI removed -->
        <!-- Fullscreen moved into the viewer title-icons to reduce accidental clicks -->
        <div id="display-status-text" style="margin-left:auto;color:#64748b">{{ versionsStatus }}</div>
      </div>

      <!-- versions modal removed -->
    </div>

    <!-- settings dialog component -->
    <SettingsDialog v-if="showSettings" :source="store.sourceUrl" :edit="store.editUrl" @save="onSettingsSave"
      @close="showSettings = false" />

    <Toast />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, onBeforeUnmount, nextTick } from 'vue'
import { useProtocolStore } from '../stores/protocolStore'
import Sidebar from './Sidebar.vue'
import ProtocolViewer from './ProtocolViewer.vue'
import { htmlToSource } from '../services/bracketReverseService'
import LoadingProgress from './LoadingProgress.vue'
import Toast from './Toast.vue'
import { useToastStore } from '../stores/toastStore'
import SettingsDialog from './SettingsDialog.vue'
import languageService from '../services/languageService'

const { t } = languageService

const store = useProtocolStore()
const viewerRef = ref(null)
// draftHtml used when temporarily overriding the viewer
const draftHtmlForViewer = ref(null)
const viewerContentOverride = ref(null)
const versionsStatus = ref('')
const isFullscreen = ref(false)
const toastStore = useToastStore()

onMounted(() => {
  store.fetchProtocols()
})

onBeforeUnmount(() => {
  // no autosave timers to clean up
})

// Global keyboard shortcuts:
// - Ctrl+C => doCopy() when no selection is active
// - Ctrl+Alt+C => copySource()
// - Ctrl+Shift+F => toggleFullscreen()
function globalKeyHandler(e) {
  try {
    const tag = (e.target && e.target.tagName) || ''
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)
    if (isEditable) return // don't intercept when typing in inputs

    const key = (e.key || '').toLowerCase()
    // If user has a non-empty selection, allow native Ctrl+C behavior
    const selection = (typeof window !== 'undefined' && window.getSelection) ? (window.getSelection().toString() || '') : ''
    if (e.ctrlKey && !e.altKey && !e.shiftKey && key === 'c') {
      // Ctrl+C -> copy full protocol only when nothing is selected
      if (selection && selection.length > 0) return
      e.preventDefault()
      doCopy()
      return
    }

    if (e.ctrlKey && e.altKey && !e.shiftKey && key === 'c') {
      // Ctrl+Alt+C -> copy source
      e.preventDefault()
      copySource()
      return
    }

    if (e.ctrlKey && e.shiftKey && !e.altKey && key === 'f') {
      // Ctrl+Shift+F -> toggle fullscreen
      e.preventDefault()
      toggleFullscreen()
      return
    }
  } catch (err) {
    console.error('globalKeyHandler error', err)
  }
}

onMounted(() => {
  window.addEventListener('keydown', globalKeyHandler)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', globalKeyHandler)
})

function onSelect(item, version) {
  const id = item?.STT ?? item?.id ?? item?.['STT'] ?? item?.['Tên'] ?? null
  if (id != null) store.selectById(id, version)
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
    let src = htmlToSource(html || '')

    // Prepend version title if available
    const vTitle = viewerRef.value?.getEditedTitle ? viewerRef.value.getEditedTitle() : (store.selectedVersion?.title || '')
    if (store.selectedVersion && vTitle) {
      src = `(#${vTitle}) ${src}`
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(src)
    } else {
      const ta = document.createElement('textarea')
      ta.value = src
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch (e) { }
      ta.remove()
    }
    versionsStatus.value = t('sourceCopied')
    toastStore.addToast(t('sourceCopiedToast'), 'success')
  } catch (e) {
    console.error('copySource failed', e)
    versionsStatus.value = t('copyError')
    toastStore.addToast(t('copyError'), 'error')
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
  versionsStatus.value = t('resetToDefault')
}

const current = computed(() =>
  store.protocols.find((p) => String(p.STT ?? p.id ?? p['STT'] ?? p['Tên']) === String(store.selectedId)) || null
)

function onSave(updated) {
  store.updateProtocol(updated)
}

async function onCopy(text) {
  // The viewer already writes to clipboard; here we provide UI feedback.
  toastStore.addToast(t('protocolCopiedToast'), 'success')
  console.log('Copied text length:', (text || '').length)
}

function onRefresh() {
  store.refresh()
}

// handle edited drafts emitted from ProtocolViewer
function onEdited(payload) {
  // Keep latest draft in memory but do not persist or autosave
  if (!payload || !payload.id) return
  draftHtmlForViewer.value = payload.html
  versionsStatus.value = `${t('unsavedDraft')} ${payload.id}`

  // Mark as edited in store so UI updates (asterisk, reset button)
  if (store.selectedVersion && store.selectedId) {
    const contentChanged = payload.isChanged
    const titleChanged = store.selectedVersion.title !== store.selectedVersion.originalTitle
    const isEdited = contentChanged || titleChanged
    store.markVersionAsEdited(store.selectedId, store.selectedVersion.title, isEdited)
  }
}

watch(() => store.selectedId, () => {
  // clear draftHtml when switching
  draftHtmlForViewer.value = null
  viewerContentOverride.value = null
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

function openEditLink() {
  try {
    const url = store.editUrl || ''
    if (url) window.open(url, '_blank')
  } catch (e) {
    console.error('openEditLink', e)
  }
}

const showSettings = ref(false)
function onSettingsSave(payload) {
  try {
    const s = (payload && payload.source) ? String(payload.source).trim() : ''
    const e = (payload && payload.edit) ? String(payload.edit).trim() : ''
    store.setSourceUrl(s)
    store.setEditUrl(e)
    showSettings.value = false
    // reload data from new URL
    store.fetchProtocols(true)
  } catch (err) {
    console.error('onSettingsSave', err)
  }
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

.display__bottombar {
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
  justify-content: center;
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
