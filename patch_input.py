with open('src/services/bracketService.js', 'r') as f:
    content = f.read()

# in formatInlineToHtml
old_format = """function formatInlineToHtml(str = '') {
  // preserve newlines and markdown-style bold (**text**)
  if (str == null) return ''
  const escaped = escapeHtml(String(str))
  // convert **bold** -> <strong>escaped</strong>
  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  // preserve newlines as <br>
  return bolded.replace(/\\r\\n|\\r|\\n/g, '<br>')
}"""

new_format = """function formatInlineToHtml(str = '') {
  // preserve newlines and markdown-style bold (**text**)
  if (str == null) return ''
  const escaped = escapeHtml(String(str))

  // replace ... with an input span placeholder.
  // Wait, if it's already in contenteditable="true" div, we just need a styled span.
  // Let's use a class to make it look like an input and placeholder if empty.
  // However, the rule says: "Mặc định sẽ cho người dùng điền tay giá trị tại vị trí đó. Khi người dùng điền thì dấu ... Sẽ bị thay thế luôn."
  // If we just leave it as text `...`, when user types over it, it is replaced natively by contenteditable.
  // To make it explicit, we can wrap `...` in `<span class="bracket-input" contenteditable="true">...</span>`
  // Actually, since the container is already contenteditable, we can just style `...`? No, we need it to disappear completely when user types.
  // Let's wrap `...` in `<span class="bracket-input">...</span>`?

  const bolded = escaped.replace(/\*\*(.+?)\*\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  let html = bolded.replace(/\\r\\n|\\r|\\n/g, '<br>')

  // Convert '...' into a span. We use zero-width spaces or something?
  // Let's just use `<span class="bracket-input">...</span>`. We will add logic in ProtocolViewer to clear it on focus/input.
  html = html.replace(/\.\.\./g, '<span class="bracket-input">...</span>')

  return html
}"""

content = content.replace(old_format, new_format)

with open('src/services/bracketService.js', 'w') as f:
    f.write(content)
