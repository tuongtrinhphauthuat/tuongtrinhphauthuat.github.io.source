import re

with open('src/services/bracketReverseService.js', 'r') as f:
    content = f.read()

# find the span replacement in htmlToSource for variables
old_var_replace = """        if (idx === 0) {
          // build definition with '*' on selected
          const out = info.choices.map((c, i) => (i === info.sel ? escapeSlashForOutput(c) + '*' : escapeSlashForOutput(c))).join('/')
          const textNode = document.createTextNode('[$' + name + '$=' + out + ']')
          span.parentNode.replaceChild(textNode, span)
        } else {
          const t = document.createTextNode('$' + name + '$')
          span.parentNode.replaceChild(t, span)
        }"""

new_var_replace = """        if (idx === 0) {
          // build definition with '*' on selected
          const out = info.choices.map((c, i) => (i === info.sel ? escapeSlashForOutput(c) + '*' : escapeSlashForOutput(c))).join('/')
          const textNode = document.createTextNode('[$' + name + '$=' + out + ']')
          span.parentNode.replaceChild(textNode, span)
        } else {
          const isInverse = span.getAttribute('data-var-inverse') === 'true'
          const t = document.createTextNode('$' + (isInverse ? '^' : '') + name + '$')
          span.parentNode.replaceChild(t, span)
        }"""

content = content.replace(old_var_replace, new_var_replace)

with open('src/services/bracketReverseService.js', 'w') as f:
    f.write(content)
