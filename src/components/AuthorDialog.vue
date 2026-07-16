<template>
  <div class="author-overlay" @click.self="emit('close')">
    <div class="author-card">
      <header class="author-card__header">
        <h3>{{ t('authorDialogTitle') }}</h3>
        <button class="author-card__close" type="button" @click="emit('close')">×</button>
      </header>
      <p class="author-card__body">
        {{ t('authorDialogSummary') }}
      </p>

      <section class="author-card__section">
        <h4>{{ t('authorDialogSpecialtiesTitle') }}</h4>
        <ul>
          <li>{{ t('authorDialogSpecialtySurgery') }}</li>
          <li>{{ t('authorDialogSpecialtyVascular') }}</li>
          <li>{{ t('authorDialogSpecialtyInnovation') }}</li>
        </ul>
      </section>

      <section class="author-card__section">
        <h4>{{ t('authorDialogContactTitle') }}</h4>
        <p class="author-card__contact">
          {{ t('authorDialogContactLocation') }}<br>
          <strong>{{ t('authorDialogPhoneLabel') }}</strong>: <a :href="`tel:${contactPhoneLink}`">{{ contactPhone }}</a><br>
          <strong>{{ t('authorDialogEmailLabel') }}</strong>: <a :href="`mailto:${contactEmail}`">{{ contactEmail }}</a>
        </p>
      </section>

      <div class="author-card__actions">
        <button class="author-card__action author-card__action--primary" type="button" @click="openProfile">
          {{ t('authorDialogContactButton') }}
        </button>
        <button class="author-card__action author-card__action--ghost" type="button" @click="emit('close')">
          {{ t('authorDialogButton') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import languageService from '../services/languageService'

const { t } = languageService
const emit = defineEmits(['close'])

const PROFILE_URL = 'https://www.longnguctimmach.com/p/lien-he.html'
const contactPhone = '039 444 6896'
const contactPhoneLink = '0394446896'
const contactEmail = 'bsquochoainew@gmail.com'

function openProfile() {
  try {
    window.open(PROFILE_URL, '_blank', 'noopener')
  } catch (err) {
    console.warn('Unable to open author profile', err)
  }
}
</script>

<style scoped>
.author-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 400;
  padding: 16px;
}

.author-card {
  background: var(--panel-bg);
  border-radius: 12px;
  width: 400px;
  max-width: 100%;
  padding: 20px;
  box-shadow: 0 25px 35px rgba(15, 23, 42, 0.25);
}

.author-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.author-card__header h3 {
  margin: 0;
  font-size: 1.2rem;
  color: var(--text-color);
}

.author-card__close {
  background: transparent;
  border: none;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  color: var(--text-color);
}

.author-card__body {
  margin: 0 0 16px 0;
  color: var(--text-color);
  line-height: 1.6;
}

.author-card__section {
  margin-bottom: 16px;
}

.author-card__section h4 {
  margin: 0 0 6px 0;
  font-size: 0.95rem;
  color: var(--text-color);
}

.author-card__section ul {
  margin: 0;
  padding-left: 18px;
  color: var(--text-color);
}

.author-card__contact a {
  color: #2563eb;
  text-decoration: none;
}

.author-card__contact a:hover {
  text-decoration: underline;
}

.author-card__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.author-card__action {
  flex: 1;
  min-width: 140px;
  border-radius: 8px;
  border: none;
  padding: 10px 14px;
  font-weight: 600;
  cursor: pointer;
}

.author-card__action--primary {
  background: linear-gradient(120deg, var(--primary-color), #6366f1);
  color: var(--panel-bg);
}

.author-card__action--ghost {
  background: var(--hover-bg);
  color: var(--text-color);
}
</style>
