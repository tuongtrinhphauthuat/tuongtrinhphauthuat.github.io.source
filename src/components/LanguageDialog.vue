<template>
  <Teleport to="body">
    <div class="floating-dialog" :style="styleObject" ref="dialogRef">
      <header class="floating-dialog__header">{{ t('languageDialogTitle') }}</header>
      <p class="floating-dialog__hint">{{ t('languageDialogDescription') }}</p>
      <div class="floating-dialog__list">
        <button v-for="lang in languageService.languageOptions" :key="lang.code"
          :class="['floating-dialog__item', { 'is-active': currentLang === lang.code }]" type="button"
          @click="selectLanguage(lang.code)">
          <span class="floating-dialog__flag">{{ lang.flag }}</span>
          <span class="floating-dialog__label">{{ lang.label }}</span>
          <span v-if="currentLang === lang.code" class="floating-dialog__check">✓</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import languageService from '../services/languageService'

const props = defineProps({
  position: {
    type: Object,
    default: () => ({ x: 120, y: 70 })
  }
})
const emit = defineEmits(['close'])

const { currentLang, setLanguage, t } = languageService
const dialogRef = ref(null)

const styleObject = computed(() => {
  const width = 260
  let left = props.position?.x ?? 120
  let top = props.position?.y ?? 70
  if (typeof window !== 'undefined') {
    left = Math.min(window.innerWidth - width - 16, Math.max(16, left))
    top = Math.min(window.innerHeight - 200, Math.max(60, top))
  }
  return { left: `${left}px`, top: `${top}px`, width: `${width}px` }
})

function selectLanguage(lang) {
  setLanguage(lang)
  emit('close', { reason: 'selected' })
}

function handleClickOutside(event) {
  if (!dialogRef.value) return
  if (dialogRef.value.contains(event.target)) return
  emit('close', { reason: 'outside' })
}

onMounted(() => {
  if (typeof document === 'undefined') return
  document.addEventListener('click', handleClickOutside, true)
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.removeEventListener('click', handleClickOutside, true)
})
</script>

<style scoped>
.floating-dialog {
  position: fixed;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.2);
  padding: 16px;
  z-index: 300;
}

.floating-dialog__header {
  margin: 0 0 4px 0;
  font-weight: 700;
  color: #0f172a;
}

.floating-dialog__hint {
  margin: 0 0 12px 0;
  font-size: 13px;
  color: #475569;
}

.floating-dialog__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.floating-dialog__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-weight: 600;
}

.floating-dialog__item.is-active {
  background: #dbeafe;
  border-color: #93c5fd;
}

.floating-dialog__flag {
  font-size: 20px;
}

.floating-dialog__label {
  flex: 1;
  color: #0f172a;
}

.floating-dialog__check {
  color: #0f172a;
  font-size: 16px;
}
</style>
