<template>
  <aside class="protocols__sidebar">
    <div class="protocols__search">
      <input class="protocols__input" v-model="q" placeholder="Tìm kiếm (Dấu phẩy = OR, e.g. giáp, thùy)"
        @input="onInput" />
    </div>

    <ul class="protocols__list">
      <li v-for="(item, idx) in filtered" :key="idOf(item) || nameOf(item) || originalIndex(item, idx)"
        :class="['protocols__list-item', { 'is-selected': isSelected(item) }]" @click="select(item)"
        :title="displayLabel(item, idx)">
        <div class="protocols__line">{{ displayLabel(item, idx) }}</div>
      </li>
    </ul>
    <div class="protocols__bottombar">
      <button class="icon-btn" title="Refresh protocols" @click="$emit('refresh')">🔄</button>
      <button class="icon-btn" title="Open spreadsheet for edit" @click="$emit('open-edit')">✏️</button>
      <button class="icon-btn" title="Settings" @click="$emit('open-settings')">⚙️</button>
      <button class="icon-btn" title="Keyboard shortcuts" @click="showShortcuts = true" aria-label="Show keyboard shortcuts">⌨️</button>
    </div>

    <ShortcutsDialog v-if="showShortcuts" @close="showShortcuts = false" />
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import ShortcutsDialog from './ShortcutsDialog.vue'

const props = defineProps({
  protocols: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: null }
})
const emit = defineEmits(['select', 'refresh', 'open-edit', 'open-settings'])

const q = ref('')
const showShortcuts = ref(false)

function nameOf(obj) {
  return obj && (obj['Tên'] || obj['name'] || obj['Name'] || obj['title'] || '')
}

function idOf(obj) {
  return obj && (obj.STT ?? obj.id ?? obj['STT'] ?? null)
}

const tokens = computed(() =>
  q.value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
)

const filtered = computed(() => {
  const list = props.protocols || []
  if (!tokens.value.length) return list
  const low = tokens.value.map((t) => t.toLowerCase())
  return list.filter((p) => {
    const name = (nameOf(p) || '').toLowerCase()
    return low.some((t) => name.includes(t))
  })
})

function select(item) {
  emit('select', item)
}

function isSelected(item) {
  const id = idOf(item)
  return id != null && String(id) === String(props.selectedId)
}

function originalIndex(item, idx) {
  // Try to find the item's original index in the full protocols list (xlsx order)
  const list = props.protocols || []
  const i = list.indexOf(item)
  return i >= 0 ? i : idx
}

function displayLabel(item, idx) {
  const name = nameOf(item) || ''
  const num = item && (item.STT ?? item.id ?? null)
  const displayNum = (num != null && num !== '') ? num : (originalIndex(item, idx) + 1)
  return String(displayNum) + '. ' + (name || '')
}

function onInput() {
  // computed filtering is instant — left for future debouncing
}

// expose showShortcuts for template
</script>

<style scoped>
/* small local tweaks; main visual styles are kept in ProtocolDisplay.vue */
/* small local tweaks; main visual styles are kept in ProtocolDisplay.vue */
.protocols__search {
  margin-bottom: 12px;
  flex-shrink: 0
}

.protocols__input {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #e6eef8;
  background: #fff
}

.protocols__list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex: 1;
  min-height: 0
}

.protocols__list-item {
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
  cursor: pointer;
  background: transparent;
  text-align: left
}

.protocols__list-item.is-selected {
  background: linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%);
  color: #fff
}

.protocols__line {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis
}

.protocols__bottombar {
  display: flex;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid rgba(16, 24, 40, .04);
  align-items: center;
  margin-top: auto;
  flex-shrink: 0
}

.icon-btn {
  background: #fff;
  border: 1px solid #e3e8ef;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer
}
</style>
