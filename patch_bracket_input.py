import re

# We will modify bracketService.js to output <span class="bracket-input">...</span>
# (Actually it already does this, but let's be sure)
with open('src/services/bracketService.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace if needed
content = content.replace(
    "res = res.replace(inputRe, '<span class=\"bracket-input\"></span>')",
    "res = res.replace(inputRe, '<span class=\"bracket-input\">...</span>')"
)

with open('src/services/bracketService.js', 'w', encoding='utf-8') as f:
    f.write(content)


# We will modify ProtocolViewer.vue to add the click handler to select the text
with open('src/components/ProtocolViewer.vue', 'r', encoding='utf-8') as f:
    vue_content = f.read()

click_handler = """
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
"""

if "Xử lý click cho ô input `...`" not in vue_content:
    vue_content = vue_content.replace(
        "  // detect bracket option spans",
        click_handler + "\n  // detect bracket option spans"
    )

with open('src/components/ProtocolViewer.vue', 'w', encoding='utf-8') as f:
    f.write(vue_content)
