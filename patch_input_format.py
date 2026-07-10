with open('src/services/bracketService.js', 'r') as f:
    content = f.read()

old_format = """function formatInlineToHtml(str = '') {
  // preserve newlines and markdown-style bold (**text**)
  if (str == null) return ''
  const escaped = escapeHtml(String(str))
  // convert **bold** -> <strong>escaped</strong>
  const bolded = escaped.replace(/\\*\\*(.+?)\\*\\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  // preserve newlines as <br>
  return bolded.replace(/\\r\\n|\\r|\\n/g, '<br>')
}"""

new_format = """function formatInlineToHtml(str = '') {
  if (str == null) return ''
  const escaped = escapeHtml(String(str))
  const bolded = escaped.replace(/\\*\\*(.+?)\\*\\*/g, (_m, g1) => `<strong>${g1}</strong>`)
  let html = bolded.replace(/\\r\\n|\\r|\\n/g, '<br>')
  html = html.replace(/\\.\\.\\./g, '<span class="bracket-input">...</span>')
  return html
}"""

# there are multiple formatInlineToHtml functions. Replace all.
content = content.replace(old_format, new_format)

with open('src/services/bracketService.js', 'w') as f:
    f.write(content)
