<template>
  <div class="upload-overlay" @click.self="$emit('close')">
    <div class="upload-box">
      <div class="upload-header">
        <h3 class="upload-title">Đăng ảnh lên</h3>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div class="upload-body">
        <div class="upload-left">
          <div class="form-group">
            <label>Protocol</label>
            <div class="custom-select-wrapper">
              <input type="text" v-model="protocolSearch" placeholder="Tìm kiếm protocol..." class="form-control" @focus="showDropdown = true" @blur="onBlurDropdown" />
              <ul v-if="showDropdown" class="protocol-dropdown">
                <li v-for="p in filteredProtocols" :key="p.STT || p.id" @mousedown.prevent="selectProtocol(p)">
                  {{ p.STT }} - {{ p.name }}
                </li>
                <li v-if="!filteredProtocols.length" class="no-results">Không tìm thấy</li>
              </ul>
            </div>
            <div v-if="selectedProtocol" class="selected-protocol-info">
              Đã chọn: <strong>{{ selectedProtocol.name }}</strong>
            </div>
          </div>

          <div class="form-group">
            <label>URL Ảnh</label>
            <input type="text" v-model="imageUrl" placeholder="Nhập URL ảnh (https://...)" class="form-control" />
          </div>

          <div class="form-group">
            <label>Biến liên kết ảnh (Tuỳ chọn)</label>
            <div class="condition-row">
              <select v-model="selectedVar" class="form-control var-select">
                <option value="">-- Chọn biến --</option>
                <option v-for="v in availableVars" :key="v" :value="v">${{ v }}$</option>
              </select>
              <select v-model="selectedOp" class="form-control op-select">
                <option value="=">=</option>
                <option value="!=">!=</option>
              </select>
              <input type="text" v-model="varValue" placeholder="Giá trị..." class="form-control value-input" :disabled="!selectedVar" />
            </div>
          </div>

          <div class="form-group">
            <label>Mô tả ảnh</label>
            <textarea v-model="imageDesc" rows="3" placeholder="Nhập mô tả ảnh..." class="form-control"></textarea>
          </div>
        </div>

        <div class="upload-right">
          <div class="image-preview" v-if="isValidImageUrl">
            <img :src="imageUrl" alt="Preview" @error="imageError = true" @load="imageError = false" v-show="!imageError" />
            <div class="error-msg" v-show="imageError">Không thể tải ảnh từ URL này.</div>
          </div>
          <div class="image-placeholder" v-else>
            <span>Bản xem trước ảnh</span>
          </div>
        </div>
      </div>

      <div class="upload-footer">
        <button class="btn btn-cancel" @click="$emit('close')" :disabled="isUploading">Hủy</button>
        <button class="btn btn-upload" @click="doUpload" :disabled="isUploading || !isValid">
          {{ isUploading ? 'Đang tải lên...' : 'Đăng ảnh' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useProtocolStore } from '../stores/protocolStore'
import { useToastStore } from '../stores/toastStore'

const emit = defineEmits(['close', 'success'])
const store = useProtocolStore()
const toastStore = useToastStore()

const protocolSearch = ref('')
const showDropdown = ref(false)
const selectedProtocol = ref(null)
const imageUrl = ref('')
const imageDesc = ref('')
const selectedVar = ref('')
const selectedOp = ref('=')
const varValue = ref('')
const isUploading = ref(false)
const imageError = ref(false)

onMounted(() => {
  if (store.selectedId) {
    const p = store.protocols.find(x => String(x.id) === String(store.selectedId) || String(x.STT) === String(store.selectedId) || String(x.stt) === String(store.selectedId))
    if (p) {
      selectProtocol(p)
    }
  }
})

const filteredProtocols = computed(() => {
  const q = protocolSearch.value.toLowerCase()
  return store.protocols.filter(p => {
    const stt = String(p.STT || p.stt || '').toLowerCase()
    const name = String(p.name || '').toLowerCase()
    return stt.includes(q) || name.includes(q)
  })
})

function selectProtocol(p) {
  selectedProtocol.value = p
  protocolSearch.value = p.name
  showDropdown.value = false
}

function onBlurDropdown() {
  setTimeout(() => { showDropdown.value = false }, 200)
}

const availableVars = computed(() => {
  const vars = new Set()
  if (selectedProtocol.value && selectedProtocol.value.versions) {
    selectedProtocol.value.versions.forEach(v => {
      if (v.content) {
        const matches = v.content.match(/\$([^\$]+)\$/g)
        if (matches) {
          matches.forEach(m => vars.add(m.replace(/\$/g, '').trim()))
        }
      }
    })
  }
  return Array.from(vars).sort()
})

watch(selectedProtocol, () => {
  selectedVar.value = ''
  varValue.value = ''
})

watch(imageUrl, () => {
  imageError.value = false
})

const isValidImageUrl = computed(() => {
  return imageUrl.value.startsWith('http://') || imageUrl.value.startsWith('https://')
})

const isValid = computed(() => {
  return selectedProtocol.value && isValidImageUrl.value && !imageError.value && imageUrl.value.trim().length > 0
})

async function doUpload() {
  if (!store.appScriptUrl) {
    toastStore.addToast('Chưa cấu hình Google Apps Script URL', 'error')
    return
  }

  isUploading.value = true
  try {
    let finalLine = ''
    if (selectedVar.value && varValue.value.trim()) {
      finalLine += `[$${selectedVar.value}$ ${selectedOp.value} ${varValue.value.trim()}] `
    }
    if (imageDesc.value.trim()) {
      finalLine += `${imageDesc.value.trim()} `
    }
    finalLine += imageUrl.value.trim()

    const payload = {
      stt: selectedProtocol.value.STT || selectedProtocol.value.stt,
      columnName: 'Hình ảnh 1', // apps script will handle finding the right column or appending
      content: finalLine,
      mode: 'append_image'
    }

    const res = await fetch(store.appScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    let result = {}
    try {
      result = JSON.parse(text)
    } catch (e) {
      if (res.ok) result = { status: 'success' }
      else result = { status: 'error', message: text }
    }

    if (result.status === 'success') {
      toastStore.addToast('Đăng ảnh thành công!', 'success')
      store.fetchProtocols(true) // refresh
      emit('success')
    } else {
      throw new Error(result.message || 'Lỗi không xác định')
    }
  } catch (err) {
    console.error(err)
    toastStore.addToast(`Lỗi đăng ảnh: ${err.message}`, 'error')
  } finally {
    isUploading.value = false
  }
}
</script>

<style scoped>
.upload-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.6);
  z-index: 100000;
}

.upload-box {
  background: #fff;
  border-radius: 12px;
  width: 900px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
}

.upload-title {
  margin: 0;
  font-size: 1.25rem;
  color: #0f172a;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: #64748b;
  cursor: pointer;
}

.upload-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.upload-left {
  flex: 1;
  padding: 20px;
  border-right: 1px solid #e2e8f0;
  overflow-y: auto;
}

.upload-right {
  flex: 2;
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  overflow: hidden;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #334155;
}

.form-control {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
}

.form-control:focus {
  border-color: #0ea5e9;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.custom-select-wrapper {
  position: relative;
}

.protocol-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 10;
  list-style: none;
  padding: 0;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.protocol-dropdown li {
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
}

.protocol-dropdown li:hover {
  background: #f8fafc;
}

.protocol-dropdown li.no-results {
  color: #94a3b8;
  cursor: default;
}

.selected-protocol-info {
  margin-top: 8px;
  font-size: 0.9rem;
  color: #0ea5e9;
}

.condition-row {
  display: flex;
  gap: 10px;
}

.var-select {
  flex: 2;
}

.op-select {
  flex: 1;
}

.value-input {
  flex: 3;
}

.image-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.error-msg {
  color: #ef4444;
  margin-top: 10px;
}

.image-placeholder {
  color: #94a3b8;
  font-size: 1.1rem;
}

.upload-footer {
  padding: 16px 20px;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: #f1f5f9;
  color: #475569;
}

.btn-cancel:hover:not(:disabled) {
  background: #e2e8f0;
}

.btn-upload {
  background: #0ea5e9;
  color: white;
}

.btn-upload:hover:not(:disabled) {
  background: #0284c7;
}
</style>
