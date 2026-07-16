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
          <span v-if="inheritBadgeText" class="inherit-badge" :title="inheritTooltip" role="note"
            aria-live="polite">
            {{ inheritBadgeText }}
          </span>
          <div class="title-icons" role="toolbar" aria-label="Protocol actions">
            <!-- Reset: single click opens confirmation dialog. Double-click shortcut removed to prevent accidental resets. -->
            <button v-if="selectedVersion && selectedVersion.isEdited" id="viewer-btn-reset" class="viewer-icon-btn reset"
              @click.stop.prevent="onResetClick" :title="t('resetTooltip')">⟲</button>

            <div style="width:12px"></div>

            <button id="viewer-btn-ai-rewrite" class="viewer-icon-btn" @click.stop.prevent="openAiDialog"
              title="AI Rewriting">✨</button>

            <!-- spacer to separate reset from fullscreen to avoid accidental clicks -->
            <div style="width:12px"></div>

            <!-- Fullscreen: emit event to parent to toggle fullscreen (Ctrl+Shift+F) -->
            <button id="viewer-btn-fullscreen" class="viewer-icon-btn" @click.stop.prevent="$emit('toggle-fullscreen')"
              :title="t('toggleFullscreen')">⤢</button>

            <!-- Confirmation dialog (shown when user single-clicks reset) -->
            <ConfirmDialog v-if="showConfirm" :title="t('confirmResetTitle')" :message="t('confirmResetMessage')"
              :confirmText="t('reset')" :cancelText="t('cancel')" @confirm="onConfirmReset"
              @cancel="showConfirm = false" />
          </div>
        </h2>
        <!-- variable selectors removed — variable pills are clickable inline now -->

        <div class="protocols__editor-body">
          <div class="protocols__editor-area">
            <div class="protocols__tabs">
              <div class="protocols__tab" :class="{'is-active': activeTab === 'interactive'}" @click="switchTab('interactive')">Interactive</div>
              <div class="protocols__tab" :class="{'is-active': activeTab === 'source'}" @click="switchTab('source')">Source Code</div>
            </div>

            <div v-show="activeTab === 'interactive'" id="viewer-content-editable" ref="editor" class="protocols__editor-content" contenteditable="true"
              v-html="editorHtml" @input="onInput" @click="onEditorClick"></div>

            <textarea v-if="activeTab === 'source'" class="protocols__editor-content protocols__source-textarea"
              v-model="sourceCodeContent" @input="onSourceInput"></textarea>

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
          <ProtocolImages v-if="visibleImages.length" :images="visibleImages" />
        </div>
      </div>
    </div>
    <PushVersionDialog
      v-if="showPushDialog"
      :protocolStt="current?.STT || current?.id || current?.['STT']"
      :protocolName="nameOf(current)"
      :title="editedVersionTitle"
      :content="getHtmlToSource()"
      :originalColumnName="selectedVersion?.columnName"
      :suggestedNewColumnName="suggestedNewColumnName"
      @close="showPushDialog = false"
      @success="onPushSuccess"
    />

    <AiRewriteDialog
      v-if="showAiDialog"
      :promptPayload="aiPromptPayload"
      @close="showAiDialog = false"
      @success="onAiRewriteSuccess"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import ConfirmDialog from './ConfirmDialog.vue'
import ProtocolImages from './ProtocolImages.vue'
import PushVersionDialog from './PushVersionDialog.vue'
import { parseBracketsToHtml, applyChoiceInDom, applyVarChoiceInDom, replaceVarTokensInDom, getPlainTextFromContainer } from '../services/bracketService'
import { htmlToSource } from '../services/bracketReverseService'
import { generateRewritePrompt } from '../services/promptService'
import AiRewriteDialog from './AiRewriteDialog.vue'
import draftService from '../services/draftService'
import changeDetectionService from '../services/changeDetectionService'
import languageService from '../services/languageService'
import { filterImagesByVariables } from '../services/imageService'

import { useProtocolStore } from '../stores/protocolStore'
import { useToastStore } from '../stores/toastStore'

const { t, currentLang } = languageService

const store = useProtocolStore()
const toastStore = useToastStore()
const props = defineProps({
  current: { type: Object, default: null },
  selectedVersion: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: [String, Boolean, null], default: null },
  // optional draftHtml allows the parent to ask the viewer to render a saved draft/html snapshot
  draftHtml: { type: String, default: null }
})
const emit = defineEmits(['copy', 'edited', 'reset', 'toggle-fullscreen', 'progress'])

const editor = ref(null)
const editorHtml = ref('')
const options = ref([])
const varDefs = ref([])
const activeTab = ref('interactive')
const sourceCodeContent = ref('')
const popupVisible = ref(false)
const popupX = ref(0)
const popupY = ref(0)
const popupSelectedIndex = ref(0)
const activeOptId = ref(null)
const popupType = ref(null) // 'opt' | 'var' or null
const activeVarName = ref(null)
const saveTimer = ref(null)
const showConfirm = ref(false)
const editedVersionTitle = ref('')
const initialSuppress = ref(false)
const showPushDialog = ref(false)

const totalBlanks = ref(0)
const filledBlanks = ref(0)
const showAiDialog = ref(false)
const aiPromptPayload = ref('')

const suggestedNewColumnName = computed(() => {
  if (!props.current || !props.current.versions) return 'Nội dung 1'
  const versions = props.current.versions
  if (versions.length === 0) return 'Nội dung 1'

  // Look for the last column that starts with 'Nội dung'
  let highestIndex = 0
  let firstEmptyIndex = -1

  // Actually we need to see what columns exist. We just assume versions are sorted by index or we can extract the number
  // from column names
  for (let i = 0; i < versions.length; i++) {
    const v = versions[i]
    if (v.columnName && v.columnName.toLowerCase().startsWith('nội dung')) {
      const match = v.columnName.match(/\d+/)
      if (match) {
        const num = parseInt(match[0], 10)
        if (num > highestIndex) {
          highestIndex = num
        }
      }

      // If it's an empty version, we might want to suggest it as the new column
      if (firstEmptyIndex === -1 && (!v.content || v.content.trim() === '')) {
         return v.columnName // return the first empty column
      }
    }
  }

  // If we found no empty columns, we suggest the next one
  return `Nội dung ${highestIndex + 1}`
})

function getHtmlToSource() {
  return htmlToSource(editor.value ? editor.value.innerHTML : editorHtml.value)
}

function onPushSuccess() {
  showPushDialog.value = false
  if (toastStore && toastStore.addToast) {
    toastStore.addToast(t('pushSuccess'), 'success')
  }
  // optional: reset the draft status and fetch latest
  if (props.current) {
    const id = getDraftId(props.current, props.selectedVersion)
    draftService.clearDraft(id)
  }
  store.fetchProtocols(true)
}

const availableImages = computed(() => {
  if (props.selectedVersion && Array.isArray(props.selectedVersion.images) && props.selectedVersion.images.length) {
    return props.selectedVersion.images
  }
  if (props.current && Array.isArray(props.current.images)) {
    return props.current.images
  }
  return []
})

const visibleImages = computed(() => filterImagesByVariables(availableImages.value, varDefs.value))

const inheritBadgeText = computed(() => {
  if (!props.selectedVersion || !props.selectedVersion.isInherited) return ''
  const inherit = props.selectedVersion.inherit || {}
  const parentLabel = inherit.parentTitle || inherit.parentKey || inherit.directive || ''
  const prefix = currentLang.value === 'vi' ? 'Kế thừa' : 'Inherited'
  return parentLabel ? `${prefix}: ${parentLabel}` : prefix
})

const inheritTooltip = computed(() => {
  if (!props.selectedVersion || !props.selectedVersion.isInherited) {
    return ''
  }
  const inherit = props.selectedVersion.inherit || {}
  const lines = []
  if (inherit.parentTitle) {
    lines.push(`${currentLang.value === 'vi' ? 'Từ cột' : 'Parent'}: ${inherit.parentTitle}`)
  } else if (inherit.parentKey) {
    lines.push(`${currentLang.value === 'vi' ? 'Cột' : 'Column'}: ${inherit.parentKey}`)
  }
  if (inherit.directive) {
    lines.push(`${currentLang.value === 'vi' ? 'Directive' : 'Directive'}: ${inherit.directive}`)
  }
  if (inherit.overridesRaw) {
    lines.push(`${currentLang.value === 'vi' ? 'Ghi chú' : 'Overrides'}: ${inherit.overridesRaw}`)
  }
  return lines.join('\n') || (currentLang.value === 'vi' ? 'Phiên bản kế thừa' : 'Inherited version')
})

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
  // During initial setup (loadContent sets the title programmatically),
  // do NOT treat this as a user edit.
  if (initialSuppress.value) return

  if (props.current && props.selectedVersion) {
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
  // suppress initial onInput emits while we programmatically set up the editor
  initialSuppress.value = true
  // if a draftHtml is provided by parent, that takes precedence
  if (props.draftHtml) {
    editorHtml.value = props.draftHtml
  } else {
    const id = getDraftId(nv, version)
    let raw = ''

    const originalRaw = version && version.displayContent ? version.displayContent : (nv ? nv['Nội dung'] || nv['content'] || '' : '')
    totalBlanks.value = (originalRaw.match(/\.\.\./g) || []).length

    if (version && version.displayContent) {
      raw = version.displayContent
    } else {
      raw = nv ? nv['Nội dung'] || nv['content'] || '' : ''
    }

    // Check for saved draft
    if (id && draftService.hasDraft(id)) {
      const draft = draftService.getDraft(id)
      if (draft) {
        // If the XLSX content changed since the draft was saved, discard the draft.
        const isOutdated = draft.originalSource && draft.originalSource !== raw

        if (isOutdated) {
          console.log('Draft is outdated (XLSX changed). Discarding draft for', id)
          draftService.clearDraft(id)
          // use raw (XLSX content); isEdited stays false — original was restored
        } else {
          // Restore draft content and title for display.
          // Do NOT emit 'edited' here — the isEdited flag is already persisted
          // in the store via _applyPersistedFlags(). Emitting here would trigger
          // onEdited() in the parent which calls markVersionAsEdited() again,
          // potentially setting isEdited if the draft content is identical to original.
          raw = draft.content
          if (draft.title !== null && draft.title !== undefined) {
            editedVersionTitle.value = draft.title
          }
          toastStore.addToast('Đã khôi phục bản nháp tự động lưu', 'info')
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
        editor.value.addEventListener && editor.value.addEventListener('keydown', onEditorKeydown)
        try { editor.value._bracketClickAttached = true } catch (e) { }
      }
    } catch (e) {
      // ignore
    }
    // allow future onInput emits (user edits) to run change detection again
    initialSuppress.value = false
    updateProgress()
  })
}

function updateProgress() {
  if (!editor.value) return
  const text = getPlainTextFromContainer(editor.value)
  const remaining = (text.match(/\.\.\./g) || []).length
  filledBlanks.value = Math.max(0, totalBlanks.value - remaining)
  emit('progress', {
    total: totalBlanks.value,
    filled: filledBlanks.value
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
        editor.value.addEventListener && editor.value.addEventListener('keydown', onEditorKeydown)
        try { editor.value._bracketClickAttached = true } catch (e) { }
      }
      updateProgress()
    })
  },
  { immediate: false }
)

function nameOf(obj) {
  return obj && (obj['Tên'] || obj['name'] || obj['Name'] || obj['title'] || '')
}

function doReset() {
  try {
    // suppress emits while we reload canonical content
    initialSuppress.value = true
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

    // Mark version as not edited in store (and persist)
    try {
      const pid = props.current ? (props.current['STT'] || props.current.id) : null
      const vtitle = props.selectedVersion ? (props.selectedVersion.originalTitle || props.selectedVersion.title) : null
      if (pid && vtitle) store.markVersionAsEdited(pid, vtitle, false)
    } catch (e) {
      // ignore
    }
    // reload canonical content and re-enable detection after it finishes
    try {
      // reload content will unset initialSuppress at the end of its setup
      loadContent(props.current, props.selectedVersion)
    } finally {
      // emit reset for other listeners
      emit('reset')
    }
  } catch (e) {
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
  // ensure any variables in the newly selected option are rendered
  replaceVarTokensInDom(editor.value, varDefs.value)
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

function openAiDialog() {
  if (!props.current) return

  // Get raw template from store or current props
  let currentTemplate = (props.selectedVersion && props.selectedVersion.displayContent) || props.current['Nội dung'] || ''

  // Generate payload string, leaving a placeholder for User Info to be replaced in the dialog
  aiPromptPayload.value = generateRewritePrompt(currentTemplate, '__USER_INFO__', props.current.versions)
  showAiDialog.value = true
}

function onAiRewriteSuccess(resultText) {
  showAiDialog.value = false
  if (!resultText) return

  // Treat the AI result as a new draft/source
  const parsed = parseBracketsToHtml(resultText)
  if (editor.value) {
    editor.value.innerHTML = parsed.html
  }
  editorHtml.value = parsed.html

  toastStore.addToast('Đã áp dụng kết quả AI', 'success')
  onInput()
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
  // ensure any variables in the newly selected option are rendered
  replaceVarTokensInDom(editor.value, varDefs.value)
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
  // ensure any variables in the newly selected option are rendered
  replaceVarTokensInDom(editor.value, varDefs.value)
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

function onEditorKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    const tgt = e.target
    if (tgt.classList && (tgt.classList.contains('bracket-opt') || tgt.classList.contains('bracket-var'))) {
      e.preventDefault()
      const rect = tgt.getBoundingClientRect()
      onEditorClick({ target: tgt, clientX: rect.left, clientY: rect.top })
    }
  }
}

function onEditorClick(e) {
  // normalize event target: clicks can land on text nodes, so ensure we have an Element
  let tgt = e && e.target ? e.target : null
  if (!tgt) return
  if (tgt.nodeType === Node.TEXT_NODE) tgt = tgt.parentElement

  // detect variable spans FIRST so nested variables can be clicked
  const spanVar = tgt.closest ? tgt.closest('.bracket-var') : null
  if (spanVar) {
    const name = spanVar.getAttribute('data-var-name')
    const rect = spanVar.getBoundingClientRect()
    // use mouse X, but element bottom Y
    openPopupForVar(name, e.clientX, rect.bottom + 4)
    return
  }


  // Xử lý click cho ô input `...`
  const spanInput = tgt.closest ? tgt.closest('.bracket-input') : null
  if (spanInput) {
    if (spanInput.textContent === '...') {
      // Select the text so typing replaces it
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(spanInput);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return
  }

  // detect bracket option spans
  const spanOpt = tgt.closest ? tgt.closest('.bracket-opt') : null
  if (spanOpt) {
    const id = spanOpt.getAttribute('data-opt-id')
    const rect = spanOpt.getBoundingClientRect()
    // use mouse X, but element bottom Y
    openPopupForOpt(id, e.clientX, rect.bottom + 4)
    return
  }

  // click outside bracket closes popup
  if (popupVisible.value) popupVisible.value = false
}

// compute popup items depending on popupType
const varDisplayMap = computed(() => {
  const map = {}
  varDefs.value.forEach((v) => {
    const val = Array.isArray(v.choices) ? v.choices[v.selected] : ''
    map[v.name] = val || ''
  })
  return map
})

function resolveChoiceLabel(choiceText = '') {
  if (!choiceText || !choiceText.includes('$')) return choiceText || ''
  return choiceText.replace(/\$([^$]+)\$/g, (_m, name) => {
    const trimmed = String(name || '').trim()
    return Object.prototype.hasOwnProperty.call(varDisplayMap.value, trimmed)
      ? varDisplayMap.value[trimmed]
      : `$${trimmed}$`
  })
}

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
    // Replace variables in choices with their current values
    return (o.choices || []).map((choice) => resolveChoiceLabel(choice))
  }
  if (popupType.value === 'var') {
    const v = varDefs.value.find((x) => x.name === activeVarName.value) || { choices: [] }
    return (v.choices || []).map((choice) => resolveChoiceLabel(choice))
  }
  return []
})

function popupChoose(index) {
  if (popupType.value === 'opt') return chooseAndClose(index)
  if (popupType.value === 'var') return chooseVarFromPopup(index)
}

function switchTab(tab) {
  if (activeTab.value === tab) return

  if (tab === 'source') {
    // Generate source code from current editor content
    const html = editor.value ? editor.value.innerHTML : editorHtml.value
    sourceCodeContent.value = htmlToSource(html)
  } else if (tab === 'interactive') {
    // Parse source code back to HTML
    const parsed = parseBracketsToHtml(sourceCodeContent.value)
    editorHtml.value = parsed.html
    options.value = parsed.options.map((o) => ({ ...o }))
    varDefs.value = (parsed.varDefs || []).map((v) => ({ ...v }))

    // trigger save
    onSourceInput()
  }
  activeTab.value = tab
}

function onSourceInput() {
  if (initialSuppress.value) return
  if (saveTimer.value) clearTimeout(saveTimer.value)
  saveTimer.value = setTimeout(() => {
    try {
      if (!props.current) return

      const text = sourceCodeContent.value
      // Update interactive HTML so it saves correctly
      const parsed = parseBracketsToHtml(text)
      const html = parsed.html
      const source = text

      const id = getDraftId(props.current, props.selectedVersion)
      let originalRaw = ''
      if (props.selectedVersion && props.selectedVersion.displayContent) {
        originalRaw = props.selectedVersion.displayContent
      } else {
        originalRaw = props.current['Nội dung'] || props.current['content'] || ''
      }

      const contentChanged = changeDetectionService.isContentChanged(source, originalRaw)
      const titleChanged = editedVersionTitle.value !== (props.selectedVersion?.originalTitle ?? props.selectedVersion?.title ?? '')
      const isChanged = contentChanged || titleChanged

      if (isChanged) {
        draftService.saveDraft(id, source, editedVersionTitle.value, originalRaw)
      } else {
        draftService.clearDraft(id)
      }

      emit('edited', { id, html, text, ts: Date.now(), isChanged })

      updateProgress()
    } catch (err) {
      console.error('emit edited failed', err)
    }
  }, 600)
}

function onInput() {
  // During initial programmatic setup (load/version switch), ignore all input events.
  // Only real user interactions (typing, bracket clicks) should reach here.
  if (initialSuppress.value) return

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
      if (!props.current) return

      const html = editor.value ? editor.value.innerHTML : editorHtml.value
      const text = getPlainTextFromContainer(editor.value || { innerText: '' })
      const id = getDraftId(props.current, props.selectedVersion)
      const source = htmlToSource(editor.value)

      // Get original content (XLSX) to compare against
      let originalRaw = ''
      if (props.selectedVersion && props.selectedVersion.displayContent) {
        originalRaw = props.selectedVersion.displayContent
      } else {
        originalRaw = props.current['Nội dung'] || props.current['content'] || ''
      }

      // Always compute isChanged by comparing current content to original XLSX source.
      // Never shortcut via selectedVersion.isEdited to avoid carrying stale state.
      const contentChanged = changeDetectionService.isContentChanged(source, originalRaw)
      const titleChanged = editedVersionTitle.value !== (props.selectedVersion?.originalTitle ?? props.selectedVersion?.title ?? '')
      const isChanged = contentChanged || titleChanged

      // Only save draft when there is an actual change to avoid polluting localStorage.
      if (isChanged) {
        draftService.saveDraft(id, source, editedVersionTitle.value, originalRaw)
      } else {
        // No real change — clear any stale draft that may exist
        draftService.clearDraft(id)
      }

      emit('edited', { id, html, text, ts: Date.now(), isChanged })
    } catch (err) {
      console.error('emit edited failed', err)
    }
  }, 600)
}

async function onCopy() {
  if (!editor.value) return
  const text = getPlainTextFromContainer(editor.value)

  // Validation for missing info
  const remaining = (text.match(/\.\.\./g) || []).length
  if (remaining > 0) {
    // Highlight empty inputs
    const inputs = editor.value.querySelectorAll('.bracket-input')
    inputs.forEach(i => {
      if (i.textContent.includes('...')) {
        i.classList.add('missing-info-highlight')
      }
    })
    const confirm = window.confirm(`Bạn còn ${remaining} vị trí chưa điền thông tin (...). Bạn có chắc chắn muốn copy không?`)
    if (!confirm) {
      return
    }
  }

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
  pushVersion: () => {
    if (!store.appScriptUrl) {
      toastStore.addToast(t('appScriptUrlMissing'), 'error')
      return
    }
    showPushDialog.value = true
  },
  reset: async () => {
    // hide any open popup and reload content after DOM stabilizes
    popupVisible.value = false
    await nextTick()
    loadContent(props.current, props.selectedVersion)
    // ensure click handler attached after reload
    setTimeout(() => {
      if (editor.value && !editor.value._bracketClickAttached) {
        editor.value.addEventListener && editor.value.addEventListener('click', onEditorClick)
        editor.value.addEventListener && editor.value.addEventListener('keydown', onEditorKeydown)
        try { editor.value._bracketClickAttached = true } catch (e) { }
      }
    }, 40)
  }
})

// ensure initial spans are non-editable after mount
onMounted(() => {
  // NOTE: We intentionally do NOT call onInput() here.
  // Calling onInput() on mount triggers change detection before the user does anything,
  // causing false isChanged positives. The editor content is already set by loadContent()
  // via the watch on [current, selectedVersion] which runs with { immediate: true }.

  // attach click listener to editor for bracket clicks if not already attached
  if (editor.value && !editor.value._bracketClickAttached) {
    editor.value.addEventListener && editor.value.addEventListener('click', onEditorClick)
    editor.value.addEventListener && editor.value.addEventListener('keydown', onEditorKeydown)
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
  color: var(--text-color)
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

.protocols__editor-body {
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 16px;
  min-height: 0;
  overflow: hidden;
  align-items: stretch
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
  color: var(--text-color);
}

.title-separator {
  color: var(--text-color);
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
  color: var(--text-color);
  min-width: 150px;
  outline: none;
  flex: 1;
}

.title-version-input:focus {
  border-color: #eab308;
  box-shadow: 0 0 0 2px rgba(234, 179, 8, 0.2);
}

.inherit-badge {
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
  color: var(--primary-color);
  font-size: .95rem;
  padding: 2px 10px;
  border-radius: 999px;
  font-weight: 600;
  margin-left: 4px;
  white-space: nowrap;
}

.title-icons {
  margin-left: auto;
  display: flex;
  gap: 10px;
}

.viewer-icon-btn {
  background: var(--panel-bg);
  border: 1px solid #e3e8ef;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
}

.viewer-icon-btn.reset {
  background: #fff7f7;
  border-color: var(--missing-info-border);
  color: var(--missing-info-border);
}

.protocols__editor-area {
  flex: 3;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden
}

.protocols__editor-content {
  width: 100%;
  border-radius: 0 8px 8px 8px; /* Make it look connected to the tabs */
  border: 1px solid var(--border-color);
  padding: 12px;
  font-family: inherit;
  outline: none;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  text-align: left;
  padding-bottom: 80px;
  background: var(--panel-bg);
  position: relative;
  z-index: 5;
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
  background: var(--bg-color);
  border: 1px dashed var(--border-color);
  cursor: pointer;
  font-weight: 700;
  color: #1f2937;
  margin: 0 4px
}

.protocols__empty {
  color: var(--text-color);
  padding: 30px;
  text-align: center
}

.protocols__error {
  color: var(--missing-info-border)
}
</style>

<style>
.bracket-popup {
  position: fixed;
  z-index: 9999;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  padding: 8px;
  border-radius: 8px;
  box-shadow: 0 6px 18px rgba(2, 6, 23, .08);
  max-width: 360px;
  color: var(--text-color);
}

.bracket-list {
  list-style: none;
  margin: 0;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
  min-width: 160px;
  scrollbar-width: thin;
}

.bracket-list li {
  padding: 12px 14px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  white-space: normal;
  word-break: break-word;
  word-wrap: break-word;
  font-size: 1.05em;
  color: var(--text-color);
}

.bracket-list li:hover {
  background: var(--hover-bg);
  border-color: var(--border-color);
}
</style>

<!-- global styles for bracket markers inserted via v-html (must not be scoped) -->
<style>
.bracket-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(90deg, #fff7cc, #fde68a);
  border: 1px solid #f0c57a;
  padding: 8px 14px;
  border-radius: 10px;
  margin: 2px 4px;
  /* allow text to wrap inside the pill */
  white-space: normal;
  word-break: break-word;
  word-wrap: break-word;
  max-width: 36rem;
  font-size: 1.05em;
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
  color: var(--text-color);
  font-style: italic;
  pointer-events: none;
  user-select: none
}


.bracket-empty-preview::before {
  content: '';
  margin-right: 4px
}

.bracket-input {
  color: #94a3b8;
  background: var(--bg-color);
  border-radius: 4px;
  padding: 0 4px;
  font-family: monospace;
  cursor: text;
  display: inline-block;
  min-width: 20px;
}
.bracket-input:empty::before {
  content: '...';
  color: var(--border-color);
}

</style>

.protocols__tabs {
  display: flex;
  gap: 4px;
  margin-bottom: -1px; /* Overlap the editor border to hide the bottom border */
  padding-left: 8px;
  z-index: 10;
  position: relative;
}
.protocols__tab {
  padding: 8px 16px;
  border-radius: 8px 8px 0 0;
  border: 1px solid var(--border-color);
  background: var(--input-bg);
  cursor: pointer;
  font-weight: 600;
  color: var(--text-color);
  opacity: 0.7;
  transition: all 0.2s;
  user-select: none;
}
.protocols__tab:hover {
  opacity: 1;
}
.protocols__tab.is-active {
  background: var(--panel-bg);
  color: var(--primary-color);
  border-bottom: 1px solid var(--panel-bg); /* Match background to hide bottom border line */
  opacity: 1;
  box-shadow: 0 -2px 0 0 var(--primary-color) inset;
}
.protocols__source-textarea {
  resize: none;
  font-family: 'Consolas', 'Courier New', monospace;
  white-space: pre;
  overflow: auto;
  line-height: 1.5;
  padding: 16px;
  background: var(--input-bg);
  color: var(--text-color);
  font-size: 14px;
}
