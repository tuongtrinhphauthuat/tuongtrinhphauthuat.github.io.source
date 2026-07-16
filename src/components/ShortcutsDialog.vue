<template>
  <div id="shortcuts-overlay" class="shortcuts-overlay" @click.self="close">
    <div id="shortcuts-dialog" class="shortcuts-box" role="dialog" aria-modal="true" :aria-label="t('shortcuts')">
      <div class="shortcuts-header">
        <h3>{{ t('shortcuts') }}</h3>
        <button id="shortcuts-btn-close-header" class="close-btn" @click="close" :aria-label="t('close')">✕</button>
      </div>
      <div class="shortcuts-content">
        <ul>
          <li><strong>Ctrl + C</strong>: {{ t('shortcutCopy') }}</li>
          <li><strong>Ctrl + Alt + C</strong>: {{ t('shortcutCopySource') }}</li>
          <li><strong>Ctrl + Shift + F</strong>: {{ t('shortcutFullscreen') }}</li>
          <li><strong>{{ t('reset') }}</strong>: {{ t('shortcutReset') }}</li>
        </ul>
        <p class="note">{{ t('shortcutNote') }}</p>
      </div>
      <div class="shortcuts-actions">
        <button id="shortcuts-btn-close-footer" class="btn" @click="close">{{ t('close') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'
import languageService from '../services/languageService'

const { t } = languageService
const emit = defineEmits(['close'])
function close() {
  emit('close')
}
</script>

<style scoped>
.shortcuts-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.45);
  z-index: 100005;
}

.shortcuts-box {
  background: var(--panel-bg);
  padding: 16px;
  border-radius: 8px;
  min-width: 320px;
  max-width: 90%;
  box-shadow: 0 8px 24px rgba(2, 6, 23, 0.15);
}

.shortcuts-header {
  display: flex;
  align-items: center;
  justify-content: space-between
}

.shortcuts-header h3 {
  margin: 0
}

.close-btn {
  background: transparent;
  border: 0;
  font-size: 16px;
  cursor: pointer
}

.shortcuts-content {
  margin-top: 12px
}

.shortcuts-content ul {
  padding-left: 18px;
  margin: 0 0 12px 0
}

.shortcuts-content li {
  margin-bottom: 8px
}

.note {
  color: var(--text-color);
  font-size: 13px
}

.shortcuts-actions {
  display: flex;
  justify-content: flex-end
}

.btn {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid #e6eef8;
  background: var(--panel-bg);
  cursor: pointer
}
</style>
