with open('src/components/ProtocolViewer.vue', 'r') as f:
    content = f.read()

# 1. Template: add tabs and the source code textarea
old_template_area = """        <div class="protocols__editor-body">
          <div class="protocols__editor-area">
            <div id="viewer-content-editable" ref="editor" class="protocols__editor-content" contenteditable="true"
              v-html="editorHtml" @input="onInput" @click="onEditorClick"></div>
            <!-- inline popup for bracket options -->"""

new_template_area = """        <div class="protocols__editor-body">
          <div class="protocols__editor-area">
            <div class="protocols__tabs">
              <button class="protocols__tab" :class="{'is-active': activeTab === 'interactive'}" @click="switchTab('interactive')">Interactive</button>
              <button class="protocols__tab" :class="{'is-active': activeTab === 'source'}" @click="switchTab('source')">Source Code</button>
            </div>

            <div v-show="activeTab === 'interactive'" id="viewer-content-editable" ref="editor" class="protocols__editor-content" contenteditable="true"
              v-html="editorHtml" @input="onInput" @click="onEditorClick"></div>

            <textarea v-if="activeTab === 'source'" class="protocols__editor-content protocols__source-textarea"
              v-model="sourceCodeContent" @input="onSourceInput"></textarea>

            <!-- inline popup for bracket options -->"""

content = content.replace(old_template_area, new_template_area)

# 2. Script: add activeTab, sourceCodeContent, switchTab, onSourceInput
# Find the setup section to add refs
old_refs = """const options = ref([])
const varDefs = ref([])"""

new_refs = """const options = ref([])
const varDefs = ref([])
const activeTab = ref('interactive')
const sourceCodeContent = ref('')"""

content = content.replace(old_refs, new_refs)

# Add logic inside setup
old_logic = """function onInput() {"""

new_logic = """function switchTab(tab) {
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
    } catch (err) {
      console.error('emit edited failed', err)
    }
  }, 600)
}

function onInput() {"""

content = content.replace(old_logic, new_logic)

# 3. Add CSS for tabs
css_add = """
.protocols__tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.protocols__tab {
  padding: 6px 12px;
  border-radius: 6px 6px 0 0;
  border: 1px solid #e6eef8;
  border-bottom: none;
  background: #f8fafc;
  cursor: pointer;
  font-weight: 600;
  color: #475569;
}
.protocols__tab.is-active {
  background: #fff;
  color: #0f172a;
  border-bottom: 2px solid #3b82f6;
}
.protocols__source-textarea {
  resize: none;
  font-family: monospace;
  white-space: pre-wrap;
}
"""
content = content + css_add

with open('src/components/ProtocolViewer.vue', 'w') as f:
    f.write(content)
