<template>
  <nav id="app-menu" class="app-menu" role="menubar">
    <div v-for="menu in items" :key="menu.id" :id="menu.domId" :class="[menu.className, 'app-menu__group', { 'is-open': openMenuId === menu.id }]"
      @mouseenter="openMenu(menu.id)" @mouseleave="onGroupMouseLeave(menu.id, $event)">
      <button class="app-menu__trigger" type="button" role="menuitem" @click="toggleMenu(menu.id)">
        <span v-if="menu.icon" class="app-menu__trigger-icon" aria-hidden="true">{{ menu.icon }}</span>
        <span class="app-menu__trigger-label">{{ menu.label }}</span>
      </button>
      <div v-if="openMenuId === menu.id" class="app-menu__dropdown" role="menu">
        <button v-for="child in menu.children" :key="child.id" :id="child.domId"
          :class="[child.className, 'app-menu__entry']" type="button" role="menuitem"
          @click="emitSelect(child, menu, $event)">
          <div class="app-menu__entry-main">
            <span v-if="child.icon" class="app-menu__entry-icon" aria-hidden="true">{{ child.icon }}</span>
            <span class="app-menu__entry-label">{{ child.label }}</span>
            <span v-if="child.shortcut" class="app-menu__entry-shortcut">{{ child.shortcut }}</span>
          </div>
          <div v-if="child.description" class="app-menu__entry-desc">{{ child.description }}</div>
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])
const openMenuId = ref(null)

function openMenu(id) {
  openMenuId.value = id
}

function closeMenu() {
  openMenuId.value = null
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function onGroupMouseLeave(id, event) {
  const related = event?.relatedTarget
  const current = event?.currentTarget
  if (current && related && current.contains(related)) return
  if (openMenuId.value === id) closeMenu()
}

function emitSelect(child, parent, event) {
  emit('select', {
    action: child.action,
    item: child,
    parent,
    coords: event ? { x: event.clientX, y: event.clientY } : null
  })
  closeMenu()
}

function handleDocumentClick(event) {
  if (typeof document === 'undefined') return
  const target = event.target
  if (!target) return
  const menuRoot = document.getElementById('app-menu')
  if (menuRoot && menuRoot.contains(target)) return
  closeMenu()
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('click', handleDocumentClick)
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.app-menu {
  display: flex;
  align-items: stretch;
  gap: 2px;
  background: #ffffff;
  color: #0f172a;
  padding: 0 8px;
  height: 40px;
  border-bottom: 1px solid #e2e8f0;
  z-index: 200;
  width: 100%;
  flex-shrink: 0;
}

.app-menu__group {
  position: relative;
  display: flex;
  align-items: stretch;
}

.app-menu__trigger {
  background: transparent;
  border: none;
  color: inherit;
  font-weight: 500;
  padding: 0 10px;
  height: 100%;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 6px;
}

.app-menu__trigger-icon {
  font-size: 0.9rem;
}

.app-menu__group.is-open .app-menu__trigger,
.app-menu__trigger:hover {
  background: #f1f5f9;
}

.app-menu__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  color: #0f172a;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  min-width: 240px;
  margin-top: 0;
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.12);
  display: flex;
  flex-direction: column;
  padding: 4px;
  z-index: 250;
}

.app-menu__entry {
  text-align: left;
  background: transparent;
  border: none;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.app-menu__entry-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-menu__entry-icon {
  font-size: 1rem;
}

.app-menu__entry:hover {
  background: #f1f5f9;
}

.app-menu__entry-label {
  font-weight: 500;
  color: #0f172a;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.app-menu__entry-shortcut {
  font-weight: 500;
  font-size: 0.78rem;
  color: #475569;
  white-space: nowrap;
}

.app-menu__entry-desc {
  font-size: 11px;
  color: #64748b;
}
</style>
