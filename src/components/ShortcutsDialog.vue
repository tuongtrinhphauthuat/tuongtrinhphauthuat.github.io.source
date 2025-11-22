<template>
  <div class="shortcuts-overlay" @click.self="close">
    <div class="shortcuts-box" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div class="shortcuts-header">
        <h3>Keyboard Shortcuts</h3>
        <button class="close-btn" @click="close" aria-label="Close">✕</button>
      </div>
      <div class="shortcuts-content">
        <ul>
          <li><strong>Ctrl + C</strong>: Copy current protocol (when no text is selected)</li>
          <li><strong>Ctrl + Alt + C</strong>: Copy protocol source (raw source text)</li>
          <li><strong>Ctrl + Shift + F</strong>: Toggle full screen mode for editor</li>
          <li><strong>Reset button</strong>: Double-click to reset immediately; single-click opens confirmation dialog</li>
        </ul>
        <p class="note">Note: If you update any shortcuts, update this component to keep the help text in sync.</p>
      </div>
      <div class="shortcuts-actions">
        <button class="btn" @click="close">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineEmits } from 'vue'
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
  background: rgba(2,6,23,0.45);
  z-index: 100005;
}
.shortcuts-box {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  min-width: 320px;
  max-width: 90%;
  box-shadow: 0 8px 24px rgba(2,6,23,0.15);
}
.shortcuts-header { display:flex; align-items:center; justify-content:space-between }
.shortcuts-header h3 { margin:0 }
.close-btn { background:transparent; border:0; font-size:16px; cursor:pointer }
.shortcuts-content { margin-top:12px }
.shortcuts-content ul { padding-left:18px; margin:0 0 12px 0 }
.shortcuts-content li { margin-bottom:8px }
.note { color:#64748b; font-size:13px }
.shortcuts-actions { display:flex; justify-content:flex-end }
.btn { padding:8px 12px; border-radius:6px; border:1px solid #e6eef8; background:#fff; cursor:pointer }
</style>
