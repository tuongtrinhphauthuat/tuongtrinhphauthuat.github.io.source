const fs = require('fs');
const file = 'src/components/Sidebar.vue';
let content = fs.readFileSync(file, 'utf8');

const oldScript = `import { ref, computed } from 'vue'
import languageService from '../services/languageService'`;

const newScript = `import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import languageService from '../services/languageService'`;

content = content.replace(oldScript, newScript);

const oldOnInput = `function onInput() {
  // computed filtering is instant — left for future debouncing
}`;

const newOnInput = `function onInput() {
  // computed filtering is instant — left for future debouncing
}

const onGlobalKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
    e.preventDefault()
    const input = document.getElementById('sidebar-search-input')
    if (input) {
      input.focus()
      input.select()
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
})`;

content = content.replace(oldOnInput, newOnInput);
fs.writeFileSync(file, content);
