<template>
  <Teleport to="body">
    <div class="floating-size" :style="styleObject" ref="dialogRef">
      <header class="floating-size__header">{{ t('fontSizeDialogTitle') }}</header>
      <p class="floating-size__hint">{{ t('fontSizeHint') }}</p>

      <div class="floating-size__sample">
        <span class="floating-size__value">{{ displayValue }}</span>
        <span class="floating-size__text">- drquochoai</span>
      </div>

      <div class="floating-size__controls">
        <button class="floating-size__btn" type="button" @click="decrement">-</button>
        <input type="range" class="floating-size__slider" :min="minSize" :max="maxSize" :value="currentSize"
          @input="onSlider" />
        <button class="floating-size__btn" type="button" @click="increment">+</button>
      </div>

      <div class="floating-size__presets">
        <button v-for="preset in presets" :key="preset.id"
          :class="['floating-size__preset', { 'is-active': currentSize === preset.value }]"
          type="button" @click="applyPreset(preset.id)">
          {{ t(preset.labelKey) }}
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import fontSizeService from '../services/fontSizeService'
import languageService from '../services/languageService'

const props = defineProps({
  position: {
    type: Object,
    default: () => ({ x: 200, y: 80 })
  }
})
const emit = defineEmits(['close'])

const { t } = languageService
const currentSize = fontSizeService.currentSize
const presets = fontSizeService.presets
const minSize = fontSizeService.min
const maxSize = fontSizeService.max
const dialogRef = ref(null)

const styleObject = computed(() => {
  const width = 320
  let left = props.position?.x ?? 220
  let top = props.position?.y ?? 80
  if (typeof window !== 'undefined') {
    left = Math.min(window.innerWidth - width - 16, Math.max(16, left))
    top = Math.min(window.innerHeight - 260, Math.max(60, top))
  }
  return { left: `${left}px`, top: `${top}px`, width: `${width}px` }
})

const displayValue = computed(() => `${currentSize.value} pt`)

function onSlider(event) {
  const value = Number(event.target.value)
  fontSizeService.setFontSize(value)
}

function decrement() {
  fontSizeService.increment(-1)
}

function increment() {
  fontSizeService.increment(1)
}

function applyPreset(id) {
  fontSizeService.applyPreset(id)
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
.floating-size {
  position: fixed;
  background: var(--panel-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.2);
  padding: 16px;
  z-index: 300;
}

.floating-size__header {
  margin: 0 0 4px 0;
  font-weight: 700;
  color: var(--text-color);
}

.floating-size__hint {
  margin: 0 0 16px 0;
  font-size: 13px;
  color: var(--text-color);
}

.floating-size__sample {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-weight: 700;
  color: var(--text-color);
  font-size: 1.1rem;
}

.floating-size__value {
  font-size: 1.6rem;
}

.floating-size__controls {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 14px 0;
}

.floating-size__btn {
  width: 40px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--hover-bg);
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
}

.floating-size__slider {
  flex: 1;
}

.floating-size__presets {
  display: flex;
  gap: 8px;
}

.floating-size__preset {
  flex: 1;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--hover-bg);
  padding: 8px 12px;
  cursor: pointer;
  font-weight: 600;
}

.floating-size__preset.is-active {
  background: #dbeafe;
  border-color: #93c5fd;
}
</style>
