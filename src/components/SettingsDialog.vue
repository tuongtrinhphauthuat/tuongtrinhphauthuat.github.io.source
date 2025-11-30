<template>
  <div class="settings-overlay" @click.self="onClose">
    <div class="settings-box">
      <div class="settings-header">
        <div class="settings-title-text">{{ t('settings') }}</div>
        <button class="close-btn" @click="onClose">×</button>
      </div>

      <div class="settings-layout">
        <!-- Sidebar Menu -->
        <div class="settings-sidebar">
          <div class="settings-menu-item" :class="{ active: activeTab === 'general' }" @click="activeTab = 'general'">
            {{ t('generalSettings') }}
          </div>
          <div class="settings-menu-item" :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">
            {{ t('dataSettings') }}
          </div>
        </div>

        <!-- Content Area -->
        <div class="settings-content">
          <div v-if="activeTab === 'general'">
            <h3 class="settings-section-title">{{ t('settingsTitle') }}</h3>

            <label class="settings-label">{{ t('downloadUrl') }}</label>
            <div class="settings-row">
              <input class="settings-input" v-model="localSource" @click="selectAll" />
              <a v-if="localSource" :href="localSource" target="_blank" class="settings-link settings-open">{{ t('open')
                }}</a>
            </div>

            <label class="settings-label">{{ t('editUrl') }}</label>
            <div class="settings-row">
              <input class="settings-input" v-model="localEdit" @click="selectAll" />
              <a v-if="localEdit" :href="localEdit" target="_blank" class="settings-link settings-open">{{ t('open')
                }}</a>
            </div>

            <div class="settings-hint">{{ t('settingsTip') }}</div>
          </div>

          <div v-if="activeTab === 'data'">
            <h3 class="settings-section-title">{{ t('dataSettings') }}</h3>

            <div class="danger-zone">
              <h4 class="danger-title">{{ t('dangerZone') }}</h4>
              <p class="danger-desc">{{ t('clearAllDraftsDescription') }}</p>
              <button class="btn btn-danger" @click="showConfirmReset = true">{{ t('clearAllDrafts') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmDialog v-if="showConfirmReset" :title="t('confirmClearDraftsTitle')"
      :message="t('confirmClearDraftsMessage')" :confirmText="t('clearAllDrafts')" :cancelText="t('cancel')"
      @confirm="doClearDrafts" @cancel="showConfirmReset = false" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import languageService from '../services/languageService'
import ConfirmDialog from './ConfirmDialog.vue'
import appLifecycleService from '../services/appLifecycleService'

const { t } = languageService
const props = defineProps({
  source: { type: String, default: '' },
  edit: { type: String, default: '' },
  initialTab: { type: String, default: 'general' }
})
const emit = defineEmits(['save', 'close'])

const localSource = ref(props.source || '')
const localEdit = ref(props.edit || '')
const activeTab = ref(props.initialTab || 'general')
const showConfirmReset = ref(false)
watch(
  () => props.initialTab,
  (tab) => {
    if (tab && tab !== activeTab.value) activeTab.value = tab
  }
)


// Auto-save watchers
watch(localSource, (val) => {
  emit('save', { source: val || '', edit: localEdit.value || '' })
})

watch(localEdit, (val) => {
  emit('save', { source: localSource.value || '', edit: val || '' })
})

// Sync props to local state if they change externally
watch(() => props.source, (v) => {
  if (v !== localSource.value) localSource.value = v || ''
})
watch(() => props.edit, (v) => {
  if (v !== localEdit.value) localEdit.value = v || ''
})

function selectAll(ev) {
  const el = ev.target
  if (el && typeof el.select === 'function') {
    el.select()
  }
}

function onClose() {
  emit('close')
}

function doClearDrafts() {
  showConfirmReset.value = false
  appLifecycleService.clearDraftsAndReload()
}
</script>

<style scoped>
.settings-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 6, 23, 0.45);
  z-index: 100005
}

.settings-box {
  background: #fff;
  border-radius: 12px;
  width: 700px;
  max-width: 95%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-height: 80vh;
}

.settings-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
}

.settings-title-text {
  font-weight: 700;
  font-size: 1.1rem;
  color: #0f172a;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.settings-layout {
  display: flex;
  flex: 1;
  min-height: 400px;
  overflow: hidden;
  /* Ensure content scrolls inside */
}

.settings-sidebar {
  width: 200px;
  background: #f8fafc;
  border-right: 1px solid #e2e8f0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.settings-menu-item {
  padding: 10px 12px;
  border-radius: 6px;
  cursor: pointer;
  color: #475569;
  font-weight: 500;
  transition: all 0.2s;
}

.settings-menu-item:hover {
  background: #e2e8f0;
  color: #1e293b;
}

.settings-menu-item.active {
  background: #fff;
  color: #0284c7;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  font-weight: 600;
}

.settings-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.settings-section-title {
  margin: 0 0 20px 0;
  font-size: 1.25rem;
  color: #0f172a;
  padding-bottom: 10px;
  border-bottom: 1px solid #e2e8f0;
}

.settings-label {
  display: block;
  text-align: left;
  margin-top: 16px;
  margin-bottom: 8px;
  color: #334155;
  font-weight: 500;
}

.settings-input {
  width: 100%;
  padding: 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 0.95rem;
}

.settings-input:focus {
  border-color: #0ea5e9;
  outline: none;
  box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
}

.settings-row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.settings-link {
  padding: 10px 16px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #f1f5f9;
  color: #0369a1;
  text-decoration: none;
  font-weight: 500;
}

.settings-link:hover {
  background: #e2e8f0;
}

.settings-hint {
  margin-top: 12px;
  color: #64748b;
  font-size: 13px;
  font-style: italic;
}

.btn {
  padding: 10px 20px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #fff;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.danger-zone {
  border: 1px solid #fecaca;
  background: #fef2f2;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.danger-title {
  color: #b91c1c;
  margin: 0 0 8px 0;
  font-size: 1rem;
}

.danger-desc {
  color: #7f1d1d;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.btn-danger {
  background: #ef4444;
  border-color: #dc2626;
  color: #fff;
}

.btn-danger:hover {
  background: #dc2626;
}
</style>
