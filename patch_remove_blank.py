with open('src/services/bracketService.js', 'r') as f:
    content = f.read()

# In getPlainTextFromContainer
# The original code normalizes consecutive newlines:
# return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')
# We need to change it to completely remove blank lines, so replace \n+ with \n, and trim.
# "loại bỏ các hàng trống trong bản copy" -> no blank lines.

old_norm = "return text.replace(/\\r\\n/g, '\\n').replace(/\\n{3,}/g, '\\n\\n')"
new_norm = "return text.replace(/\\r\\n/g, '\\n').replace(/\\n\\s*\\n/g, '\\n').replace(/\\n+/g, '\\n').trim()"

content = content.replace(old_norm, new_norm)

with open('src/services/bracketService.js', 'w') as f:
    f.write(content)

with open('src/services/bracketReverseService.js', 'r') as f:
    content = f.read()

# Also in htmlToSource if it applies
content = content.replace(old_norm, new_norm)

with open('src/services/bracketReverseService.js', 'w') as f:
    f.write(content)
