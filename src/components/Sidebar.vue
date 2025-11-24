<template>
  <aside id="sidebar-container" class="protocols__sidebar">
    <div class="protocols__search">
      <input id="sidebar-search-input" class="protocols__input" v-model="q" :placeholder="t('searchPlaceholder')"
        autocomplete="off" @input="onInput" />
    </div>

    <ul id="sidebar-list" class="protocols__list">
      <li v-for="(item, idx) in filtered" :key="idOf(item) || nameOf(item) || originalIndex(item, idx)"
        class="protocols__list-item sidebar-list-item">
        <div :class="['protocols__item-header', { 'is-selected': isSelected(item) }]" @click="select(item)"
          :title="displayLabel(item, idx)">
          <div class="protocols__line">{{ displayLabel(item, idx) }}</div>
        </div>

        <!-- Version Submenu -->
        <ul
          v-if="(isSelected(item) || tokens.length > 0) && item.versions && item.versions.length > (tokens.length > 0 ? 0 : 1)"
          class="protocols__submenu">
          <li v-for="(v, vIdx) in item.versions" :key="vIdx"
            :class="['protocols__submenu-item', { 'is-active': isVersionSelected(v) }]"
            @click.stop="selectVersion(item, v)">
            {{ v.title }} <span v-if="v.isEdited" style="color:#f59e0b;font-weight:bold">*</span>
          </li>
        </ul>
      </li>
    </ul>
    <div id="sidebar-bottom-bar" class="sidebar__bottombar">
      <button id="sidebar-btn-refresh" class="icon-btn" :title="t('refreshProtocols')"
        @click="$emit('refresh')">🔄</button>
      <button id="sidebar-btn-edit" class="icon-btn" :title="t('openSpreadsheet')"
        @click="$emit('open-edit')">✏️</button>
      <button id="sidebar-btn-settings" class="icon-btn" :title="t('settings')"
        @click="$emit('open-settings')">⚙️</button>
      <button id="sidebar-btn-shortcuts" class="icon-btn" :title="t('shortcuts')" @click="showShortcuts = true"
        :aria-label="t('shortcuts')">⌨️</button>
    </div>

    <ShortcutsDialog v-if="showShortcuts" @close="showShortcuts = false" />
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import ShortcutsDialog from './ShortcutsDialog.vue'
import languageService from '../services/languageService'

const { t } = languageService

const props = defineProps({
  protocols: { type: Array, default: () => [] },
  selectedId: { type: [String, Number], default: null },
  selectedVersion: { type: Object, default: null }
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

  return list.map(p => {
    // Check protocol name
    const name = (nameOf(p) || '').toLowerCase()
    const nameMatch = checkMatch(name, low)

    // Check versions
    const matchingVersions = (p.versions || []).filter(v => {
      const vTitle = (v.title || '').toLowerCase()
      return checkMatch(vTitle, low)
    })

    if (nameMatch) return p
    if (matchingVersions.length) {
      // Return a copy with only matching versions to highlight them
      return { ...p, versions: matchingVersions }
    }
    return null
  }).filter(Boolean)
})

function checkMatch(text, tokens) {
  if (!text) return false
  // Sort tokens by length descending to match longest specific terms first
  const sortedTokens = [...tokens].sort((a, b) => b.length - a.length)
  const mask = new Array(text.length).fill(false)

  for (const token of sortedTokens) {
    let found = false
    let startIndex = 0
    while (startIndex < text.length) {
      const idx = text.indexOf(token, startIndex)
      if (idx === -1) break // Not found

      // Check overlap
      let overlap = false
      for (let i = 0; i < token.length; i++) {
        if (mask[idx + i]) {
          overlap = true
          break
        }
      }

      if (!overlap) {
        // Mark used
        for (let i = 0; i < token.length; i++) {
          mask[idx + i] = true
        }
        found = true
        break // Move to next token
      }

      // If overlap, try next occurrence
      startIndex = idx + 1
    }

    if (!found) return false
  }
  return true
}

function select(item) {
  // If multiple versions, select the first one by default or just the protocol?
  // Store handles default version if null.
  emit('select', item, null)
}

function selectVersion(item, version) {
  emit('select', item, version)
}

function isSelected(item) {
  const id = idOf(item)
  return id != null && String(id) === String(props.selectedId)
}

function isVersionSelected(version) {
  return props.selectedVersion && version && props.selectedVersion.title === version.title
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
  /* removed padding from here to separate header from submenu */
  margin-bottom: 6px;
  background: transparent;
  text-align: left
}

.protocols__item-header {
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
}

.protocols__item-header.is-selected {
  background: linear-gradient(90deg, #06b6d4 0%, #7c3aed 100%);
  color: #fff
}

.protocols__line {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis
}

.sidebar__bottombar {
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

.protocols__submenu {
  list-style: none;
  padding: 0;
  margin: 2px 0 0 0;
}

.protocols__submenu-item {
  padding: 6px 10px 6px 24px;
  /* Indented */
  font-size: 0.9em;
  color: #475467;
  cursor: pointer;
  border-radius: 4px;
  margin-top: 2px;
}

.protocols__submenu-item:hover {
  background: rgba(0, 0, 0, 0.03);
}

.protocols__submenu-item.is-active {
  color: #06b6d4;
  font-weight: 600;
  background: rgba(6, 182, 212, 0.05);
}
</style>
