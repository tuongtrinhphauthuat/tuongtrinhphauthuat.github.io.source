<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal ai-rewrite-dialog">
      <h3 class="dialog-title">✨ AI Rewriting (Viết tự động)</h3>

      <div class="dialog-body">
        <p class="ai-desc">Nhập tóm tắt ca phẫu thuật (Ví dụ: BN nam 45 tuổi, u đỉnh phổi phải kích thước 4x5cm, cắt thùy trên...). AI sẽ tự động điền các thông tin này vào phác đồ hiện tại.</p>

        <textarea
          v-model="userInfo"
          class="ai-user-info"
          placeholder="Nhập thông tin tóm tắt ca mổ..."
          rows="4"
        ></textarea>

        <div class="ai-settings">
          <label>Nhà cung cấp AI:</label>
          <select v-model="provider" @change="onProviderChange">
            <option value="google">Google AI Studio</option>
            <option value="openrouter">OpenRouter</option>
          </select>
        </div>

        <div class="ai-settings">
          <label>API Key:</label>
          <div style="display: flex; gap: 8px; flex: 1;">
            <input
              type="password"
              v-model="apiKey"
              placeholder="Nhập API Key của bạn..."
              class="ai-api-key"
              style="flex: 1;"
            />
            <button class="btn-reload" @click="fetchModelList" :disabled="loadingModels || !apiKey" title="Tải lại danh sách mô hình">
              {{ loadingModels ? 'Đang tải...' : 'Tải lại' }}
            </button>
          </div>
        </div>
        <p class="ai-hint" style="font-size: 12px; color: var(--text-color); opacity: 0.8; margin-top: 4px; margin-bottom: 12px;">API Key được mã hóa và lưu cục bộ trên trình duyệt của bạn.</p>

        <div class="ai-settings">
          <label>Mô hình AI:</label>
          <select v-model="selectedModel" :disabled="models.length === 0">
            <option value="" disabled v-if="models.length === 0">Chưa có mô hình nào. Hãy nhập API Key và Tải lại.</option>
            <option v-for="model in models" :key="model" :value="model">{{ model }}</option>
          </select>
        </div>

        <div v-if="error" class="ai-error">{{ error }}</div>
      </div>

      <div class="dialog-actions">
        <button class="btn-cancel" @click="$emit('close')" :disabled="loading">Hủy</button>
        <button class="btn-confirm" @click="doRewrite" :disabled="loading || !userInfo || !apiKey || !selectedModel">
          {{ loading ? 'Đang xử lý...' : 'Bắt đầu viết' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { getApiKeys, saveApiKeys, rewriteWithAI, fetchModels } from '../services/aiService'

const emit = defineEmits(['close', 'success'])

const userInfo = ref('')
const provider = ref('google')
const apiKey = ref('')
const selectedModel = ref('')
const models = ref([])
const loading = ref(false)
const loadingModels = ref(false)
const error = ref('')

// Props might contain currentTemplate and protocol versions to be passed down,
// but it's easier to just pass the prompt input to this dialog and let it return the output.
const props = defineProps({
  promptPayload: {
    type: String,
    required: true
  }
})

onMounted(() => {
  const keys = getApiKeys()
  provider.value = keys.provider || 'google'
  loadKey()
  loadCachedModels()
})

function loadKey() {
  const keys = getApiKeys()
  apiKey.value = provider.value === 'google' ? keys.google : keys.openrouter
}

function onProviderChange() {
  loadKey()
  loadCachedModels()
}

function loadCachedModels() {
  try {
    const cached = localStorage.getItem(`ai_models_${provider.value}`)
    if (cached) {
      models.value = JSON.parse(cached)
    } else {
      models.value = []
    }

    const cachedSelected = localStorage.getItem(`ai_selected_model_${provider.value}`)
    if (cachedSelected && models.value.includes(cachedSelected)) {
      selectedModel.value = cachedSelected
    } else if (models.value.length > 0) {
      selectedModel.value = models.value[0]
    } else {
      selectedModel.value = ''
    }
  } catch (e) {
    models.value = []
    selectedModel.value = ''
  }
}

watch(selectedModel, (newVal) => {
  if (newVal) {
    localStorage.setItem(`ai_selected_model_${provider.value}`, newVal)
  }
})

async function fetchModelList() {
  if (!apiKey.value) {
    error.value = "Vui lòng nhập API Key trước khi tải mô hình."
    return
  }

  error.value = ''
  loadingModels.value = true

  // Save key
  const keys = getApiKeys()
  saveApiKeys(
    provider.value === 'google' ? apiKey.value : keys.google,
    provider.value === 'openrouter' ? apiKey.value : keys.openrouter,
    provider.value
  )

  try {
    const fetchedModels = await fetchModels(provider.value, apiKey.value)
    if (fetchedModels && fetchedModels.length > 0) {
      models.value = fetchedModels
      localStorage.setItem(`ai_models_${provider.value}`, JSON.stringify(models.value))

      const cachedSelected = localStorage.getItem(`ai_selected_model_${provider.value}`)
      if (cachedSelected && models.value.includes(cachedSelected)) {
        selectedModel.value = cachedSelected
      } else {
        selectedModel.value = models.value[0]
      }
    } else {
      error.value = "Không tìm thấy mô hình nào từ nhà cung cấp."
    }
  } catch (err) {
    error.value = err.message || 'Có lỗi xảy ra khi lấy danh sách mô hình.'
  } finally {
    loadingModels.value = false
  }
}

async function doRewrite() {
  if (!apiKey.value || !userInfo.value || !selectedModel.value) return
  error.value = ''
  loading.value = true

  // Save key
  const keys = getApiKeys()
  saveApiKeys(
    provider.value === 'google' ? apiKey.value : keys.google,
    provider.value === 'openrouter' ? apiKey.value : keys.openrouter,
    provider.value
  )

  try {
    const finalPrompt = props.promptPayload.replace('__USER_INFO__', userInfo.value)
    console.log("Preparing to send prompt to AI:", finalPrompt)

    emit('success', {
      provider: provider.value,
      apiKey: apiKey.value,
      modelId: selectedModel.value,
      prompt: finalPrompt
    })
  } catch (err) {
    error.value = err.message || 'Có lỗi xảy ra khi gọi AI API.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 6, 23, .5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100002;
}

.modal {
  background: var(--panel-bg);
  padding: 18px;
  border-radius: 8px;
  min-width: 360px;
  max-width: 90%
}
.ai-rewrite-dialog {
  max-width: 500px;
  width: 100%;
}
.ai-desc {
  font-size: 14px;
  color: var(--text-color);
  margin-bottom: 12px;
}
.ai-user-info {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  resize: vertical;
  background: var(--input-bg);
  color: var(--text-color);
  font-family: inherit;
  margin-bottom: 16px;
}
.ai-settings {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.ai-settings label {
  font-weight: 500;
  width: 140px;
}
.ai-settings select, .ai-settings input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--input-bg);
  color: var(--text-color);
}
.ai-error {
  margin-top: 12px;
  color: var(--missing-info-border);
  font-size: 14px;
  background: var(--missing-info-bg);
  padding: 8px;
  border-radius: 4px;
}
</style>
