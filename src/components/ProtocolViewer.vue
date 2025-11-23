<template>
  <div class="protocols__content">

    <div id="viewer-editor-container" class="protocols__editor">
      <div v-if="!current" class="protocols__empty">{{ t('selectProtocol') }}</div>

      <div v-else class="protocols__editor-inner">
        <h2 id="viewer-title" class="protocols__title-selected">

          <span class="title-text-main">{{ nameOf(current) }}</span>
          <span v-if="selectedVersion" class="title-separator"> - </span>
          <input v-if="selectedVersion" v-model="editedVersionTitle" class="title-version-input"
            :placeholder="t('versionTitle')" />
          <span v-if="selectedVersion && selectedVersion.isEdited"
            style="color:#f59e0b;font-weight:bold;margin-left:4px;font-size:1.2rem">*</span>
          <div class="title-icons" role="toolbar" aria-label="Protocol actions">
            <!-- Reset: double-click to reset immediately. Single click opens confirmation dialog. -->
            <button id="viewer-btn-reset" class="viewer-icon-btn reset" @click.stop.prevent="onResetClick"
              @dblclick.stop.prevent="doReset" :title="t('resetTooltip')">⟲</button>

            <!-- spacer to separate reset from fullscreen to avoid accidental clicks -->
            <div style="width:12px"></div>

            <!-- Fullscreen: emit event to parent to toggle fullscreen (Ctrl+Shift+F) -->
            <button id="viewer-btn-fullscreen" class="viewer-icon-btn" @click.stop.prevent="$emit('toggle-fullscreen')"
              :title="t('toggleFullscreen')">⤢</button>

            <!-- Language Switcher -->
            <div class="lang-switcher" @mouseenter="showLangDropdown = true" @mouseleave="showLangDropdown = false">
              <button id="viewer-lang-switch" class="viewer-icon-btn" :title="t('language')">
                {{ currentLang === 'vi' ? '🇻🇳' : '🇺🇸' }}
              </button>
              <div id="viewer-lang-dropdown" v-if="showLangDropdown" class="lang-dropdown">
                <div class="lang-option" @click="setLanguage('vi')">🇻🇳 Tiếng Việt</div>
                <div class="lang-option" @click="setLanguage('en')">🇺🇸 English</div>
              </div>
            </div>

            <!-- Confirmation dialog (shown when user single-clicks reset) -->
            <ConfirmDialog v-if="showConfirm" :title="t('confirmResetTitle')" :message="t('confirmResetMessage')"
              :confirmText="t('reset')" :cancelText="t('cancel')" @confirm="onConfirmReset"
              @cancel="showConfirm = false" />
          </div>
        </h2>
        <!-- variable selectors removed — variable pills are clickable inline now -->

        <div class="protocols__editor-area">
          <div id="viewer-content-editable" ref="editor" class="protocols__editor-content" contenteditable="true"
            v-html="editorHtml" @input="onInput" @click="onEditorClick"></div>
          <!-- inline popup for bracket options -->
          <div id="viewer-bracket-popup" v-if="popupVisible" class="bracket-popup"
            :style="{ left: popupX + 'px', top: popupY + 'px' }">
            <ul class="bracket-list">
              <li v-for="(c, ci) in popupItems" :key="ci" @click.stop.prevent="popupChoose(ci)">
                {{ c }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import { parseBracketsToHtml, applyChoiceInDom, applyVarChoiceInDom, replaceVarTokensInDom, getPlainTextFromContainer } from '../services/bracketService'
import { htmlToSource } from '../services/bracketReverseService'
import draftService from '../services/draftService'
import languageService from '../services/languageService'

import { useProtocolStore } from '../stores/protocolStore'

const { t, currentLang, setLanguage } = languageService

const store = useProtocolStore()
const props = defineProps({
  current: { type: Object, default: null },
  selectedVersion: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: [String, Boolean, null], default: null },
  // optional draftHtml allows the parent to ask the viewer to render a saved draft/html snapshot
  draftHtml: { type: String, default: null }
})
const emit = defineEmits(['copy', 'edited', 'reset', 'toggle-fullscreen'])

const editor = ref(null)
const editorHtml = ref('')
const options = ref([])
const varDefs = ref([])
const popupVisible = ref(false)
const popupX = ref(0)
const popupY = ref(0)
const popupSelectedIndex = ref(0)
const activeOptId = ref(null)
const popupType = ref(null) // 'opt' | 'var' or null
const activeVarName = ref(null)
const saveTimer = ref(null)
const showConfirm = ref(false)
const showLangDropdown = ref(false)
const editedVersionTitle = ref('')

watch(
  [() => props.current, () => props.selectedVersion],
  ([newCurrent, newVersion]) => {
    // Initialize title from version or empty
    editedVersionTitle.value = newVersion ? newVersion.title : ''
    loadContent(newCurrent, newVersion)
  },
  { immediate: true }
)

// Watch for title changes to save draft and update store
watch(editedVersionTitle, (newVal, oldVal) => {
  if (props.current && props.selectedVersion) {
    // Update store immediately for sidebar reactivity
    // We need to pass the *previous* title to find the version if we didn't track it, 
    // but here we are mutating the title.
    // Actually, if we mutate the title in the store, the selectedVersion prop (which is a ref to the store object) might update?
    // Let's check: props.selectedVersion is passed from store.selectedVersion.

    // If we update the store, the prop might change.
    // But we need to be careful not to lose track of which version we are editing if the title is the key.
    // The store uses the title to find the version in `updateVersionTitle`.

    // Better approach: The store action `updateVersionTitle` updates the title.
    // We need to know the *original* title or the *current* title in the store before update.
    // Since `editedVersionTitle` is v-model, it updates on every keystroke.
    // `props.selectedVersion.title` is the source of truth.

    if (props.selectedVersion.title !== newVal) {
      const id = props.current['STT'] || props.current.id
      store.updateVersionTitle(id, props.selectedVersion.title, newVal)
    }
  }
  onInput()
})

function getDraftId(protocol, version) {
  if (!protocol) return null
  const pId = protocol['STT'] || protocol.id
  if (version && version.id) {
    return `${pId}_${version.id}`
  }
  // Fallback for backward compatibility or if id missing (shouldn't happen with new service)
  if (version && version.title) {
    return `${pId}_${version.title}`
  }
  return pId
}

function loadContent(nv, version) {
  // if a draftHtml is provided by parent, that takes precedence
  if (props.draftHtml) {
    editorHtml.value = props.draftHtml
  } else {
    const id = getDraftId(nv, version)
    let raw = ''

    if (version && version.displayContent) {
      raw = version.displayContent
    } else {
      raw = nv ? nv['Nội dung'] || nv['content'] || '' : ''
    }

    // Check for saved draft
    if (id && draftService.hasDraft(id)) {
      const draft = draftService.getDraft(id)
      if (draft) {
        // Check if original source matches current source
        // If mismatch, it means XLSX updated, so we should discard draft
        // Note: raw is the current XLSX content (displayContent)
        // draft.originalSource should match raw

        // We need to be careful: raw here is displayContent (stripped of title).
        // draft.originalSource should be the same.

        // If draft.originalSource is missing (legacy draft), we might want to keep it or discard.
        // Let's assume if missing, we keep it (safe default), or maybe discard?
        // User said: "if content downloaded from xlsx differs from original version title downloaded previously... delete local draft"
        // Actually user said: "content downloaded from xlsx differs from original version title downloaded previously" - wait.
        // "nội dung tải về của file xlsx nó khác với Tiêu đề version gốc được tải từ xlsx xuống trước đó"
        // "content downloaded from xlsx differs from original version title..." - this phrasing is confusing.
        // Likely means: "If the content from XLSX differs from the content the draft was based on".

        // Let's compare draft.originalSource with raw.
        const isOutdated = draft.originalSource && draft.originalSource !== raw

        if (isOutdated) {
          console.log('Draft is outdated (XLSX changed). Discarding draft for', id)
          draftService.clearDraft(id)
          // use raw (XLSX content)
        } else {
          raw = draft.content
          if (draft.title !== null && draft.title !== undefined) {
            editedVersionTitle.value = draft.title
          }
          // Notify parent that we are showing a draft
          emit('edited', { id, html: null, text: null, ts: Date.now(), isDraft: true })
        }
      }
    }

    const parsed = parseBracketsToHtml(raw)

    console.log('[ProtocolViewer] parsed.html first 500 chars:', parsed.html.substring(0, 500))

    // Force DOM update if editorHtml hasn't changed but DOM has
    if (editorHtml.value === parsed.html && editor.value) {
      editor.value.innerHTML = parsed.html
    }
    editorHtml.value = parsed.html

    // initialize options with selected index default 0
    options.value = parsed.options.map((o) => ({ ...o }))
    varDefs.value = (parsed.varDefs || []).map((v) => ({ ...v }))
  }
  // after DOM renders, apply initial choices to ensure spans contain labels
  setTimeout(() => {
    options.value.forEach((o) => {
      const res = applyChoiceInDom(editor.value, o.id, o.selected)
      if (res) mergeOptions(res.options, res.varDefs)
    })
    varDefs.value.forEach((v) => applyVarChoiceInDom(editor.value, v.name, v.selected, v.choices))
    // ensure any remaining literal $name$ tokens in text nodes are replaced by variable spans
    replaceVarTokensInDom(editor.value, varDefs.value)
    // ensure spans are non-editable right after initial DOM setup
    try {
      const spans = editor.value ? editor.value.querySelectorAll('.bracket-opt') : []
      spans.forEach && spans.forEach((s) => s.setAttribute && s.setAttribute('contenteditable', 'false'))
      const varspans = editor.value ? editor.value.querySelectorAll('.bracket-var') : []
      varspans.forEach && varspans.forEach((s) => s.setAttribute && s.setAttribute('contenteditable', 'false'))
      // ensure editor has the click handler attached so bracket clicks open the popup
      if (editor.value && !editor.value._bracketClickAttached) {
        editor.value.addEventListener && editor.value.addEventListener('click', onEditorClick)
        try { editor.value._bracketClickAttached = true } catch (e) { }
      }
    } catch (e) {
      // ignore
    }
  })
}

// watch for draftHtml changes (preview/restore from parent)
watch(
  () => props.draftHtml,
  (nv) => {
    if (!nv) return
    editorHtml.value = nv
    // after DOM render, ensure spans are non-editable
    setTimeout(() => {
      const spans = editor.value ? editor.value.querySelectorAll('.bracket-opt') : []
      spans.forEach && spans.forEach((s) => s.setAttribute && s.setAttribute('contenteditable', 'false'))
      const varspans = editor.value ? editor.value.querySelectorAll('.bracket-var') : []
      varspans.forEach && varspans.forEach((s) => s.setAttribute && s.setAttribute('contenteditable', 'false'))
      // ensure editor has the click handler attached so bracket clicks open the popup
      if (editor.value && !editor.value._bracketClickAttached) {
        editor.value.addEventListener && editor.value.addEventListener('click', onEditorClick)
        try { editor.value._bracketClickAttached = true } catch (e) { }
      }
    })
  },
  { immediate: false }
)

function nameOf(obj) {
  return obj && (obj['Tên'] || obj['name'] || obj['Name'] || obj['title'] || '')
}

function doReset() {
  try {
    // Clear draft
    if (props.current) {
      const id = getDraftId(props.current, props.selectedVersion)
      draftService.clearDraft(id)
    }

    // Reset title in store and local ref
    if (props.selectedVersion && props.selectedVersion.originalTitle) {
      const currentTitle = props.selectedVersion.title
      const originalTitle = props.selectedVersion.originalTitle
      if (currentTitle !== originalTitle) {
        const id = props.current['STT'] || props.current.id
        store.updateVersionTitle(id, currentTitle, originalTitle)
      }
      editedVersionTitle.value = originalTitle
    } else {
      editedVersionTitle.value = props.selectedVersion ? props.selectedVersion.title : ''
    }

    emit('reset')
  } catch (e) {
    // fallback: no-op
    console.error('doReset error', e)
  }
}

function onResetClick() {
  // open confirmation dialog on single click; actual reset occurs on dblclick or confirm
  showConfirm.value = true
}

function onConfirmReset() {
  showConfirm.value = false
  doReset()
}

function mergeOptions(newOpts, newVars) {
  if (newOpts && newOpts.length) {
    newOpts.forEach(o => {
      if (!options.value.find(x => x.id === o.id)) {
        options.value.push(o)
      }
    })
  }
  if (newVars && newVars.length) {
    newVars.forEach(v => {
      if (!varDefs.value.find(x => x.id === v.id)) {
        varDefs.value.push(v)
      }
    })
  }
}

function onOptionChange(opt) {
  // apply choice in DOM (for backward compatibility if used)
  const res = applyChoiceInDom(editor.value, opt.id, opt.selected)
  if (res) mergeOptions(res.options, res.varDefs)
  onInput() // Trigger save
}

function chooseVar(varName, index) {
  const v = varDefs.value.find((x) => x.name === varName)
  if (!v) return
  v.selected = Number(index)
  applyVarChoiceInDom(editor.value, v.name, v.selected, v.choices)
  // make sure any tokens replaced in text nodes (if they exist anywhere newly) are updated
  replaceVarTokensInDom(editor.value, varDefs.value)
}

function openPopupForOpt(optId, x, y) {
  const opt = options.value.find((o) => o.id === optId)
  if (!opt) return
  activeOptId.value = optId
  popupSelectedIndex.value = Number(opt.selected || 0)
  // position popup: x at mouse, y at bottom of element
  popupX.value = x
  popupY.value = y
  popupType.value = 'opt'
  activeVarName.value = null
  popupVisible.value = true
}

function applyAndClose() {
  const opt = options.value.find((o) => o.id === activeOptId.value)
  if (!opt) return
  opt.selected = Number(popupSelectedIndex.value)
  const res = applyChoiceInDom(editor.value, opt.id, opt.selected)
  if (res) mergeOptions(res.options, res.varDefs)
  popupVisible.value = false
  activeOptId.value = null
  popupType.value = null
  onInput() // Trigger save
}

function chooseAndClose(index) {
  const opt = options.value.find((o) => o.id === activeOptId.value)
  if (!opt) return
  // for single-type we've made the popup show only the opposite action, so map the single popup index (0)
  // to the desired selected index (toggle between 0 and 1)
  if (opt.type === 'single') {
    opt.selected = opt.selected === 0 ? 1 : 0
  } else {
    opt.selected = Number(index)
  }
  const res = applyChoiceInDom(editor.value, opt.id, opt.selected)
  if (res) mergeOptions(res.options, res.varDefs)
  popupVisible.value = false
  activeOptId.value = null
  popupType.value = null
  onInput() // Trigger save
}

function openPopupForVar(varName, x, y) {
  const v = varDefs.value.find((x) => x.name === varName)
  if (!v) return
  activeVarName.value = varName
  popupSelectedIndex.value = Number(v.selected || 0)
  popupX.value = x
  popupY.value = y
  popupType.value = 'var'
  activeOptId.value = null
  popupVisible.value = true
}

function chooseVarFromPopup(index) {
  const v = varDefs.value.find((x) => x.name === activeVarName.value)
  if (!v) return
  v.selected = Number(index)
  applyVarChoiceInDom(editor.value, v.name, v.selected, v.choices)
  // also update any tokens in DOM (text nodes)
  replaceVarTokensInDom(editor.value, varDefs.value)
  popupVisible.value = false
  activeVarName.value = null
  popupType.value = null
  onInput() // Trigger save
}

// choose from the topmenu inline list (no dropdown) — apply immediately
// NOTE: topmenu inline options removed per user request — keep inline popup only

function onEditorClick(e) {
  // normalize event target: clicks can land on text nodes, so ensure we have an Element
  let tgt = e && e.target ? e.target : null
  if (!tgt) return
  if (tgt.nodeType === Node.TEXT_NODE) tgt = tgt.parentElement

  // detect bracket option spans
  const spanOpt = tgt.closest ? tgt.closest('.bracket-opt') : null
  if (spanOpt) {
    const id = spanOpt.getAttribute('data-opt-id')
    const rect = spanOpt.getBoundingClientRect()
    // use mouse X, but element bottom Y
    openPopupForOpt(id, e.clientX, rect.bottom + 4)
    return
  }
  // detect variable spans
  const spanVar = tgt.closest ? tgt.closest('.bracket-var') : null
  if (spanVar) {
    const name = spanVar.getAttribute('data-var-name')
    const rect = spanVar.getBoundingClientRect()
    // use mouse X, but element bottom Y
    openPopupForVar(name, e.clientX, rect.bottom + 4)
    return
  }
  // click outside bracket closes popup
  if (popupVisible.value) popupVisible.value = false
}

// compute popup items depending on popupType
const popupItems = computed(() => {
  if (!popupType.value) return []
  if (popupType.value === 'opt') {
    const o = options.value.find((x) => x.id === activeOptId.value) || { choices: [] }
    // For single-type options we present only the opposite action label:
    // - if currently selected (0) => 'Hiện' -> show only 'Không hiện' to allow hiding
    // - if currently hidden (1) => 'Không hiện' -> show only 'Hiện' to allow showing
    if (o.type === 'single') {
      const sel = Number(o.selected || 0)
      return sel === 0 ? [t('hide')] : [t('show')]
    }
    return o.choices || []
  }
  if (popupType.value === 'var') {
    const v = varDefs.value.find((x) => x.name === activeVarName.value) || { choices: [] }
    return v.choices || []
  }
  return []
})

function popupChoose(index) {
  if (popupType.value === 'opt') return chooseAndClose(index)
  if (popupType.value === 'var') return chooseVarFromPopup(index)
}

function onInput() {
  // ensure bracket spans stay non-editable; re-apply contenteditable=false
  if (!editor.value) return
  const spans = editor.value.querySelectorAll('.bracket-opt')
  spans.forEach((s) => s.setAttribute('contenteditable', 'false'))
  const varspans = editor.value.querySelectorAll('.bracket-var')
  varspans.forEach((s) => s.setAttribute('contenteditable', 'false'))

  // Emit edited event (debounced) with current html and plain text to let parent persist drafts/versions
  if (saveTimer.value) clearTimeout(saveTimer.value)
  saveTimer.value = setTimeout(() => {
    try {
      const html = editor.value ? editor.value.innerHTML : editorHtml.value
      const text = getPlainTextFromContainer(editor.value || { innerText: '' })

      // Save draft
      if (props.current) {
        const id = getDraftId(props.current, props.selectedVersion)
        const source = htmlToSource(editor.value)

        // Get original content from current props to save as reference
        let originalRaw = ''
        if (props.selectedVersion && props.selectedVersion.displayContent) {
          originalRaw = props.selectedVersion.displayContent
        } else {
          originalRaw = props.current ? props.current['Nội dung'] || props.current['content'] || '' : ''
        }

        draftService.saveDraft(id, source, editedVersionTitle.value, originalRaw)
      }

      emit('edited', { id: getDraftId(props.current, props.selectedVersion), html, text, ts: Date.now() })
    } catch (err) {
      console.error('emit edited failed', err)
    }
  }, 600)
}

async function onCopy() {
  if (!editor.value) return
  const text = getPlainTextFromContainer(editor.value)
  try {
    await navigator.clipboard.writeText(text)
    emit('copy', text)
  } catch (err) {
    console.error('copy failed', err)
  }
}

// expose a small API so parent can trigger copy or read current html
defineExpose({
  copyEditor: onCopy,
  getEditorHtml: () => (editor.value ? editor.value.innerHTML : editorHtml.value),
  getEditedTitle: () => editedVersionTitle.value,
  reset: async () => {
    // hide any open popup and reload content after DOM stabilizes
    popupVisible.value = false
    await nextTick()
    loadContent(props.current, props.selectedVersion)
    // ensure click handler attached after reload
    setTimeout(() => {
      if (editor.value && !editor.value._bracketClickAttached) {
        editor.value.addEventListener && editor.value.addEventListener('click', onEditorClick)
        try { editor.value._bracketClickAttached = true } catch (e) { }
      }
    }, 40)
  }
})

// ensure initial spans are non-editable after mount
onMounted(() => {
  setTimeout(() => onInput(), 50)
  // attach click listener to editor for bracket clicks if not already attached
  if (editor.value && !editor.value._bracketClickAttached) {
    editor.value.addEventListener && editor.value.addEventListener('click', onEditorClick)
    try { editor.value._bracketClickAttached = true } catch (e) { }
  }
  // close popup on outside click; treat bracket-var as inside-target as well
  // normalize event target to handle text nodes (clicks on text nodes inside spans)
  document.addEventListener('click', (ev) => {
    let t = ev.target
    if (t && t.nodeType === Node.TEXT_NODE) t = t.parentElement
    const withinOpt = t && t.closest ? t.closest('.bracket-opt') : null
    const withinVar = t && t.closest ? t.closest('.bracket-var') : null
    const inPopup = t && t.closest ? t.closest('.bracket-popup') : null
    if (!withinOpt && !withinVar && !inPopup) popupVisible.value = false
  })
})
</script>

<style scoped>
/* minimal local styles: main visual rules are in ProtocolDisplay */
.opt-label {
  font-size: 13px;
  color: #334155
}

/* protocols__vardefs removed — variable selection is inline via clickable pills */
.protocols__editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0
}

.protocols__editor-inner {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden
}

.protocols__title-selected {
  margin: 0 0 12px 0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  /* allow wrapping on small screens */
}

.title-text-main {
  font-weight: 700;
  color: #0f172a;
}

.title-separator {
  color: #64748b;
  font-weight: 600;
}

.title-version-input {
  background: #fcfcfc;
  /* Light yellow */
  border: 1px solid #fde047;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 1.3rem;
  font-weight: 600;
  color: #0f172a;
  min-width: 150px;
  outline: none;
  flex: 1;
}

.title-version-input:focus {
  border-color: #eab308;
  box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
}

.title-icons {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.viewer-icon-btn {
  background: #fff;
  border: 1px solid #e3e8ef;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
}

.viewer-icon-btn.reset {
  background: #fff7f7;
  border-color: #fecaca;
  color: #b91c1c;
}

.lang-switcher {
  position: relative;
  display: inline-block;
}

.lang-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: #fff;
  border: 1px solid #e6eef8;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
  min-width: 120px;
  overflow: visible;
  /* Allow pseudo-element to be outside */
  margin-top: 4px;
}

/* Invisible bridge to prevent mouseleave when moving from button to dropdown */
.lang-dropdown::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 0;
  width: 100%;
  height: 10px;
  background: transparent;
}

.lang-option {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 13px;
  color: #334155;
  display: flex;
  align-items: center;
  gap: 8px;
}

.lang-option:hover {
  background: #f8fafc;
  color: #0f172a;
}

.protocols__editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden
}

.protocols__editor-content {
  width: 100%;
  border-radius: 8px;
  border: 1px solid #e6eef8;
  padding: 12px;
  font-family: inherit;
  outline: none;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  text-align: left;
  padding-bottom: 80px
}

.bracket-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(90deg, #fff7cc, #fde68a);
  border: 1px solid #f0c57a;
  padding: 4px 10px;
  border-radius: 8px;
  margin: 0 4px;
  /* allow text to wrap inside the pill */
  white-space: normal;
  word-break: break-word;
  word-wrap: break-word;
  max-width: 36rem;
  font-weight: 700 !important;
  color: #091427;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
}

.bracket-opt strong {
  font-weight: 700;
  color: inherit
}

.bracket-empty {
  opacity: 0.95;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f1f5f9;
  border: 1px dashed #cbd5e1;
  cursor: pointer;
  font-weight: 700;
  color: #1f2937;
  margin: 0 4px
}

.protocols__empty {
  color: #475569;
  padding: 30px;
  text-align: center
}

.protocols__error {
  color: #b91c1c
}
</style>

<style>
.bracket-popup {
  position: fixed;
  z-index: 9999;
  background: #fff;
  border: 1px solid #e6eef8;
  padding: 6px;
  border-radius: 6px;
  box-shadow: 0 6px 18px rgba(2, 6, 23, .08);
  max-width: 360px
}

.bracket-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 320px;
  overflow: auto;
  min-width: 160px
}

.bracket-list li {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: normal;
  word-break: break-word;
  word-wrap: break-word
}

.bracket-list li:hover {
  background: #f8fafc;
  border-color: #e6eef8
}
</style>

<!-- global styles for bracket markers inserted via v-html (must not be scoped) -->
<style>
.bracket-opt {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(90deg, #fff7cc, #fde68a);
  border: 1px solid #f0c57a;
  padding: 4px 10px;
  border-radius: 8px;
  margin: 0 4px;
  /* allow text to wrap inside the pill */
  white-space: normal;
  word-break: break-word;
  word-wrap: break-word;
  max-width: 36rem;
  font-weight: 700 !important;
  color: #091427;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.03);
}

.bracket-opt strong {
  font-weight: 700;
  color: inherit
}

.bracket-empty {
  min-width: 100px;
}

.bracket-var {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #e6f0ff;
  border: 1px solid #9fc2ff;
  padding: 4px 10px;
  border-radius: 999px;
  margin: 0 4px;
  color: #043069;
  font-weight: 700
}
</style>

<style>
.bracket-empty .bracket-empty-preview {
  opacity: 0.8;
  color: #334155;
  font-style: italic;
  pointer-events: none;
  user-select: none
}

.bracket-empty .bracket-empty-preview::before {
  content: '';
  margin-right: 4px
}
</style>
