import re

with open('src/components/ProtocolViewer.vue', 'r') as f:
    content = f.read()

# CSS update
css_new = """
.bracket-empty-preview::before {
  content: '';
  margin-right: 4px
}

.bracket-input {
  color: #94a3b8;
  background: #f1f5f9;
  border-radius: 4px;
  padding: 0 4px;
  font-family: monospace;
  cursor: text;
  display: inline-block;
  min-width: 20px;
}
.bracket-input:empty::before {
  content: '...';
  color: #cbd5e1;
}
"""
content = content.replace(".bracket-empty .bracket-empty-preview::before {\n  content: '';\n  margin-right: 4px\n}", css_new)

# script update for logic
# In onEditorClick or onMounted we want to handle clicking on bracket-input
# Actually if we just make it `<span class="bracket-input" contenteditable="true">...</span>`, the browser handles typing.
# But when you focus it, we want '...' to disappear so you can type.
# Better: in onEditorClick, if target has bracket-input, clear text if it's '...'
click_old = """  const withinOpt = t.closest('.bracket-opt')"""
click_new = """  const bracketInput = t.closest('.bracket-input')
  if (bracketInput && bracketInput.textContent === '...') {
    bracketInput.textContent = ''
    // move cursor into span
    const sel = window.getSelection()
    const range = document.createRange()
    range.selectNodeContents(bracketInput)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  const withinOpt = t.closest('.bracket-opt')"""
content = content.replace(click_old, click_new)

with open('src/components/ProtocolViewer.vue', 'w') as f:
    f.write(content)
