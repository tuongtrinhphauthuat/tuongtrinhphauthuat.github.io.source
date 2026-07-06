<template>
  <div class="push-overlay" @click.self="$emit('close')">
    <div class="push-box">
      <div class="push-header">
        <h3 class="push-title">{{ t('confirmPushTitle') }}</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="push-content">
        <div class="push-info">
          <div><strong>Protocol:</strong> {{ protocolName }}</div>
          <div class="push-edit-title">
            <strong>{{ t('versionTitle') }}:</strong>
            <input type="text" v-model="editableTitle" class="push-input inline-input" />
          </div>
        </div>

        <div class="push-options">
          <label class="push-option">
            <input type="radio" v-model="pushMode" value="overwrite" :disabled="!originalColumnName" />
            <span>{{ t('pushOverwrite') }} <small v-if="originalColumnName">({{ originalColumnName }})</small></span>
          </label>
          <label class="push-option">
            <input type="radio" v-model="pushMode" value="new" :disabled="!suggestedNewColumnName" />
            <span>{{ t('pushNewColumn') }} <small v-if="suggestedNewColumnName">({{ suggestedNewColumnName }})</small></span>
          </label>
        </div>

        <!-- Progress Indicator -->
        <div v-if="isPushing" class="push-progress">
          <div class="spinner"></div>
          <span>{{ t('pushing') }}...</span>
        </div>
      </div>

      <div class="push-footer">
        <button class="btn btn-cancel" @click="$emit('close')" :disabled="isPushing">{{ t('cancel') }}</button>
        <button class="btn btn-push" @click="doPush" :disabled="isPushing || !canPush">
          {{ isPushing ? t('pushing') : t('pushVersion') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProtocolStore } from '../stores/protocolStore'
import { useToastStore } from '../stores/toastStore'
import languageService from '../services/languageService'

const { t } = languageService
const store = useProtocolStore()
const toastStore = useToastStore()

const props = defineProps({
  protocolStt: { type: [String, Number], required: true },
  protocolName: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  originalColumnName: { type: String, default: '' },
  suggestedNewColumnName: { type: String, default: '' }
})

const emit = defineEmits(['close', 'success'])

const pushMode = ref(props.originalColumnName ? 'overwrite' : 'new')
const isPushing = ref(false)
const editableTitle = ref(props.title + ' copy')

const canPush = computed(() => {
  if (pushMode.value === 'new' && !props.suggestedNewColumnName) return false
  if (!editableTitle.value.trim()) return false
  return true
})

onMounted(() => {
  if (!props.originalColumnName && props.suggestedNewColumnName) {
    pushMode.value = 'new'
  } else if (!props.originalColumnName && !props.suggestedNewColumnName) {
    pushMode.value = 'overwrite' // Fallback, will be disabled anyway
  }
})

async function doPush() {
  if (!store.appScriptUrl) {
    toastStore.addToast(t('appScriptUrlMissing'), 'error')
    return
  }

  isPushing.value = true
  try {
    const columnName = pushMode.value === 'overwrite' ? props.originalColumnName : props.suggestedNewColumnName
    const fullContent = `(#${editableTitle.value.trim()})\n${props.content}`

    const payload = {
      stt: props.protocolStt,
      protocolName: props.protocolName,
      columnName: columnName,
      content: fullContent,
      mode: pushMode.value // 'overwrite' or 'new'
    }

    // Using text/plain to avoid CORS preflight, script parses it as JSON
    const res = await fetch(store.appScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    let result = {}
    try {
      result = JSON.parse(text)
    } catch (e) {
      console.warn('Response is not JSON:', text)
      if (res.ok) result = { status: 'success' }
      else result = { status: 'error', message: text }
    }

    if (result.status === 'success') {
      emit('success')
    } else {
      throw new Error(result.message || 'Unknown error from script')
    }
  } catch (err) {
    console.error('Push error:', err)
    toastStore.addToast(`${t('pushFailed')}: ${err.message}`, 'error')
  } finally {
    isPushing.value = false
  }
}
</script>

<style scoped>
.push-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  z-index: 100000;
}

.push-box {
  background: #fff;
  border-radius: 12px;
  width: 480px;
  max-width: 90%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.push-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.push-title {
  margin: 0;
  font-size: 1.1rem;
  color: #0f172a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  line-height: 1;
}

.close-btn:hover {
  color: #0f172a;
}

.push-content {
  padding: 20px;
}

.push-info {
  background: #f8fafc;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 20px;
  font-size: 0.95rem;
  color: #334155;
  border: 1px solid #e2e8f0;
}

.push-info div {
  margin-bottom: 4px;
}

.push-info div:last-child {
  margin-bottom: 0;
}

.push-edit-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.inline-input {
  flex: 1;
  padding: 4px 8px;
  font-size: 0.9rem;
}

.push-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  color: #0ea5e9;
  font-weight: 500;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #0ea5e9;
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.push-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.push-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: 500;
  color: #1e293b;
}

.push-option small {
  color: #64748b;
  font-weight: normal;
}

.push-new-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: 24px;
}

.push-new-col label {
  font-size: 0.9rem;
  color: #475569;
}

.push-input {
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
}

.push-input:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.push-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  background: #f8fafc;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #fff;
  border: 1px solid #cbd5e1;
  color: #475569;
}

.btn-cancel:hover:not(:disabled) {
  background: #f1f5f9;
}

.btn-push {
  background: #10b981;
  border: 1px solid #059669;
  color: #fff;
}

.btn-push:hover:not(:disabled) {
  background: #059669;
}
</style>