<template>
  <div class="modal-overlay" @click.self="onClose">
    <div class="modal push-modal">
      <div class="modal-header">
        <h3>{{ t('pushDialogTitle') }}</h3>
        <button class="close-btn" @click="onClose">×</button>
      </div>

      <div class="modal-body">
        <p class="modal-desc">{{ t('pushDialogDesc') }}</p>

        <label class="modal-label">{{ t('pushDialogTitleInput') }}</label>
        <input class="modal-input" v-model="localTitle" />

        <label class="modal-label">{{ t('pushDialogMode') }}</label>
        <div class="radio-group">
          <label class="radio-label">
            <input type="radio" v-model="mode" value="new" />
            {{ t('pushDialogModeNew') }}
          </label>
          <label class="radio-label" v-if="originalColumnName">
            <input type="radio" v-model="mode" value="overwrite" />
            {{ t('pushDialogModeOverwrite') }} ({{ originalColumnName }})
          </label>
        </div>

        <div v-if="error" class="error-msg">{{ error }}</div>
      </div>

      <div class="modal-actions">
        <button class="btn btn-cancel" @click="onClose" :disabled="loading">{{ t('cancel') }}</button>
        <button class="btn btn-primary" @click="onPush" :disabled="loading">
          <span v-if="loading">{{ t('pushing') }}</span>
          <span v-else>{{ t('pushToSheet') }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import languageService from '../services/languageService'
import { useProtocolStore } from '../stores/protocolStore'

const { t } = languageService

const props = defineProps({
  protocolStt: { type: [String, Number], required: true },
  protocolName: { type: String, required: true },
  title: { type: String, default: '' },
  content: { type: String, required: true },
  originalColumnName: { type: String, default: '' }
})

const emit = defineEmits(['close', 'success'])

const localTitle = ref(props.title || '')
const mode = ref('new')
const loading = ref(false)
const error = ref('')

const store = useProtocolStore()

async function onPush() {
  const appScriptUrl = store.appScriptUrl
  if (!appScriptUrl) {
    error.value = t('appScriptUrlMissing')
    return
  }

  // Also extract edit sheet URL because it contains the target sheet id
  let targetSheetUrl = store.editUrl
  if (!targetSheetUrl) {
      error.value = "Target Google Sheet URL is missing in Settings."
      return
  }

  loading.value = true
  error.value = ''

  try {
    const payload = {
      sheetUrl: targetSheetUrl,
      stt: props.protocolStt,
      name: props.protocolName,
      title: localTitle.value,
      content: props.content,
      mode: mode.value,
      originalColumnName: props.originalColumnName
    }

    const response = await fetch(appScriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()
    if (result.status === 'success') {
      emit('success')
    } else {
      error.value = result.message || t('pushError')
    }
  } catch (err) {
    console.error('Push error:', err)
    error.value = err.message || t('pushError')
  } finally {
    loading.value = false
  }
}

function onClose() {
  if (!loading.value) {
    emit('close')
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.45);
  z-index: 100005;
}

.push-modal {
  width: 450px;
  max-width: 95%;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0f172a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.modal-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-desc {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
}

.modal-label {
  font-weight: 600;
  color: #334155;
  margin-bottom: 4px;
  display: block;
}

.modal-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.modal-input:focus {
  border-color: #0ea5e9;
  outline: none;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  color: #1e293b;
}

.error-msg {
  color: #dc2626;
  background: #fef2f2;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.9rem;
  border: 1px solid #fecaca;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn {
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-cancel {
  background: #fff;
  border-color: #cbd5e1;
  color: #475569;
}

.btn-cancel:hover:not(:disabled) {
  background: #f1f5f9;
  color: #1e293b;
}

.btn-primary {
  background: #0ea5e9;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #0284c7;
}
</style>