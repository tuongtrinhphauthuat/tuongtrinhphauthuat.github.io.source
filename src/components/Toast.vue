<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast" tag="div">
      <div v-for="t in toasts" :key="t.id" :class="['toast', t.type || 'info']" @click="remove(t.id)">
        <div class="toast-message">{{ t.message }}</div>
        <button class="toast-close" @click.stop.prevent="remove(t.id)" aria-label="Close">✕</button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toastStore'
import { storeToRefs } from 'pinia'
const store = useToastStore()
const { toasts } = storeToRefs(store)
function remove(id) { store.removeToast(id) }
</script>

<style scoped>
.toast-container {
  position: fixed;
  right: 18px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 200000;
}
.toast {
  display:flex;
  align-items:center;
  gap:10px;
  background: #111827;
  color: #fff;
  padding: 10px 12px;
  border-radius: 8px;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(2,6,23,0.24);
  cursor: pointer;
}
.toast.info { background: linear-gradient(90deg,#0ea5a4,#7c3aed) }
.toast.success { background: linear-gradient(90deg,#10b981,#06b6d4) }
.toast.error { background: linear-gradient(90deg,#ef4444,#f97316) }
.toast-message { flex:1; font-weight:600 }
.toast-close { background:transparent; border:0; color:#fff; cursor:pointer; font-size:14px }

/* fade-in/out animation */
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px) scale(0.98) }
.toast-enter-active, .toast-leave-active { transition: all 220ms cubic-bezier(.2,.8,.2,1) }
.toast-enter-to, .toast-leave-from { opacity: 1; transform: translateY(0) scale(1) }
</style>
