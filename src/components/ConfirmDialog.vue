<template>
  <div class="confirm-overlay" @click.self="cancel">
    <div class="confirm-box" role="dialog" aria-modal="true">
      <h3 class="confirm-title">{{ title }}</h3>
      <p class="confirm-message">{{ message }}</p>
      <div class="confirm-actions">
        <button class="btn btn-cancel" @click="cancel">{{ cancelText }}</button>
        <button class="btn btn-confirm" @click="confirm">{{ confirmText }}</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

const props = defineProps({
  title: { type: String, default: 'Confirm' },
  message: { type: String, default: 'Are you sure?' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' }
})

const emit = defineEmits(['confirm', 'cancel'])

function confirm() {
  emit('confirm')
}

function cancel() {
  emit('cancel')
}
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2,6,23,0.45);
  z-index: 100005;
}
.confirm-box {
  background: var(--panel-bg);
  padding: 16px;
  border-radius: 8px;
  min-width: 320px;
  max-width: 90%;
  box-shadow: 0 8px 24px rgba(2,6,23,0.15);
}
.confirm-title { margin: 0 0 8px 0 }
.confirm-message { margin: 0 0 12px 0; color: var(--text-color) }
.confirm-actions { display:flex; gap:10px; justify-content:flex-end }
.btn { padding:8px 12px; border-radius:6px; border:1px solid #e6eef8; background:var(--panel-bg); cursor:pointer }
.btn-confirm { background:var(--missing-info-border); color:var(--panel-bg); border-color: #fca5a5 }
.btn-cancel { background:var(--panel-bg) }
</style>
