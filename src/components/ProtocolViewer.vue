<template>
  <div class="protocols__content">

    <div id="viewer-editor-container" class="protocols__editor">
      <div v-if="!current" class="protocols__empty">{{ t('selectProtocol') }}</div>

      <div v-else class="protocols__editor-inner">
        <h2 id="viewer-title" class="protocols__title-selected">
          <span class="title-text">{{ nameOf(current) }}</span>
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

const { t, currentLang, setLanguage } = languageService

const props = defineProps({
  current: { type: Object, default: null },
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

watch(
  () => props.current,
  (nv) => {
    loadContent(nv)
  },
  { immediate: true }
)

function loadContent(nv) {
  // if a draftHtml is provided by parent, that takes precedence
  if (props.draftHtml) {
    editorHtml.value = props.draftHtml
  } else {
    const id = nv ? (nv['STT'] || nv.id) : null
    let raw = nv ? nv['Nội dung'] || nv['content'] || '' : ''

    // Check for saved draft
    if (id && draftService.hasDraft(id)) {
      const draft = draftService.getDraft(id)
      if (draft) {
        raw = draft
        // Notify parent that we are showing a draft
        emit('edited', { id, html: null, text: null, ts: Date.now(), isDraft: true })
      }
    }

    const parsed = parseBracketsToHtml(raw)
    editorHtml.value = parsed.html
    // initialize options with selected index default 0
    options.value = parsed.options.map((o) => ({ ...o }))
    varDefs.value = (parsed.varDefs || []).map((v) => ({ ...v }))
  }
  // after DOM renders, apply initial choices to ensure spans contain labels
  setTimeout(() => {
    options.value.forEach((o) => applyChoiceInDom(editor.value, o.id, o.selected))
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
      const id = props.current['STT'] || props.current.id
      draftService.clearDraft(id)
    }
    emit('reset')
  } catch (e) {
    // fallback: no-op
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

function onOptionChange(opt) {
  // apply choice in DOM (for backward compatibility if used)
  applyChoiceInDom(editor.value, opt.id, opt.selected)
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
  applyChoiceInDom(editor.value, opt.id, opt.selected)
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
  applyChoiceInDom(editor.value, opt.id, opt.selected)
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
        const id = props.current['STT'] || props.current.id
        const source = htmlToSource(editor.value)
        draftService.saveDraft(id, source)
      }

      emit('edited', { id: props.current ? (props.current['STT'] || props.current.id) : null, html, text, ts: Date.now() })
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
  reset: async () => {
    // hide any open popup and reload content after DOM stabilizes
    popupVisible.value = false
    await nextTick()
    loadContent(props.current)
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
