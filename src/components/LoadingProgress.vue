<template>
  <div class="loading-overlay" role="status" aria-live="polite">
    <div class="loading-box">
      <div class="spinner" aria-hidden="true"></div>
      <div class="loading-text">{{ message || t('loadingMessage') }}</div>
    </div>
  </div>
</template>

<script setup>
import languageService from '../services/languageService'

const { t } = languageService
const props = defineProps({
  message: { type: String, default: null }
})
</script>

<style scoped>
.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.8);
  z-index: 100000;
}

.loading-box {
  display: flex;
  gap: 14px;
  align-items: center;
  background: #fff;
  padding: 14px 18px;
  border-radius: 10px;
  box-shadow: 0 8px 30px rgba(2, 6, 23, 0.08);
}

.loading-text {
  font-size: 16px;
  color: #0f172a;
  font-weight: 600;
}

.spinner {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 4px solid #e6eef8;
  border-top-color: #7c3aed;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
