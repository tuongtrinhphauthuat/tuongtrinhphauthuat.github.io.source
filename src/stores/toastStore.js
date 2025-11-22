import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function addToast(message, type = 'info', timeout = 3000) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const t = { id, message, type }
    toasts.value.push(t)
    if (timeout && timeout > 0) {
      setTimeout(() => removeToast(id), timeout)
    }
    return id
  }

  function removeToast(id) {
    const i = toasts.value.findIndex((x) => x.id === id)
    if (i >= 0) toasts.value.splice(i, 1)
  }

  function clear() {
    toasts.value = []
  }

  return { toasts, addToast, removeToast, clear }
})
