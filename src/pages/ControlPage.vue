<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'

type MatchState = {
  id?: number
  currentSet: number
  status: string
  isActive: boolean
  clock: {
    time: string | null
    isRunning: boolean
  }
  team1: {
    name: string
    score: number
    timeoutsUsed: number
  }
  team2: {
    name: string
    score: number
    timeoutsUsed: number
  }
}

const route = useRoute()
const screenId = computed(() => Number(route.params.id))
const tvBaseUrl = import.meta.env.VITE_TV_URL

const loading = ref(true)
const error = ref('')
const formError = ref('')
const saving = ref(false)
const noMatch = ref(false)
const createErrorDetails = ref('')

const match = ref<MatchState | null>(null)

const team1Name = ref('КОМАНДА 1')
const team2Name = ref('КОМАНДА 2')
const currentSet = ref(1)
const periodTime = ref('00:00')
const status = ref<'draft' | 'live' | 'paused'>('draft')

// UI only, поки без backend підтримки
const fouls1 = ref(0)
const fouls2 = ref(0)

function syncFormFromMatch(data: MatchState) {
  team1Name.value = data.team1.name
  team2Name.value = data.team2.name
  currentSet.value = data.currentSet
  periodTime.value = data.clock.time ?? '00:00'
  status.value = (data.status as 'draft' | 'live' | 'paused') ?? 'draft'
}

function applyMatch(data: MatchState) {
  match.value = data
  noMatch.value = false
  syncFormFromMatch(data)
}

function validateForm() {
  if (!team1Name.value.trim()) {
    formError.value = 'Назва команди 1 обовʼязкова'
    return false
  }
  if (!team2Name.value.trim()) {
    formError.value = 'Назва команди 2 обовʼязкова'
    return false
  }
  if (currentSet.value < 1) {
    formError.value = 'Номер сету має бути не менше 1'
    return false
  }
  if (!/^\d{2}:\d{2}$/.test(periodTime.value)) {
    formError.value = 'Час має бути у форматі ХХ:ХХ'
    return false
  }

  formError.value = ''
  return true
}

async function loadCurrentMatch() {
  try {
    loading.value = true
    error.value = ''
    noMatch.value = false

    const response = await api.get(`/screens/${screenId.value}/current`)
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err: any) {
    if (err.response?.status === 404) {
      noMatch.value = true
      error.value = ''
    } else {
      error.value = 'Не вдалося завантажити матч'
      console.error(err)
    }
  } finally {
    loading.value = false
  }
}
async function changeFouls(team: 1 | 2, delta: number) {
  if (!match.value?.id) return

  try {
    const response = await api.patch(`/matches/${match.value.id}/fouls`, { team, delta })
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося змінити фоли'
  }
}

async function pausePeriod() {
  if (!match.value?.id) return

  try {
    const response = await api.post(`/matches/${match.value.id}/pause-period`)
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося поставити паузу'
  }
}

async function createMatch() {
  if (!validateForm()) return

  try {
    saving.value = true
    formError.value = ''
    createErrorDetails.value = ''

    const response = await api.post('/matches', {
      screenId: screenId.value,
      sportType: 'volleyball',
      team1Name: team1Name.value.trim(),
      team2Name: team2Name.value.trim(),
      currentSet: currentSet.value,
      periodTime: periodTime.value,
    })

    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err: any) {
    console.error(err)
    formError.value = 'Не вдалося створити матч'
    createErrorDetails.value =
      err?.response?.data?.message || JSON.stringify(err?.response?.data || {})
  } finally {
    saving.value = false
  }
}

async function changeScore(team: 1 | 2, delta: number) {
  if (!match.value?.id) return

  try {
    const response = await api.patch(`/matches/${match.value.id}/score`, { team, delta })
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося змінити рахунок'
  }
}

async function saveSettings() {
  if (!match.value?.id) return
  if (!validateForm()) return

  try {
    saving.value = true

    const response = await api.patch(`/matches/${match.value.id}/settings`, {
      team1Name: team1Name.value.trim(),
      team2Name: team2Name.value.trim(),
      currentSet: currentSet.value,
      periodTime: periodTime.value,
      status: status.value,
    })

    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося зберегти налаштування'
  } finally {
    saving.value = false
  }
}

async function takeTimeout(team: 1 | 2) {
  if (!match.value?.id) return

  try {
    const response = await api.patch(`/matches/${match.value.id}/timeout`, { team })
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося зарахувати таймаут'
  }
}

async function startPeriod() {
  if (!match.value?.id) return

  try {
    const response = await api.post(`/matches/${match.value.id}/start-period`)
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося почати період'
  }
}

async function endPeriod() {
  if (!match.value?.id) return

  try {
    const response = await api.post(`/matches/${match.value.id}/end-period`)
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося завершити період'
  }
}

async function resetMatch() {
  if (!match.value?.id) return
  if (!window.confirm('Справді скинути матч?')) return

  try {
    const response = await api.post(`/matches/${match.value.id}/reset`)
    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося скинути матч'
  }
}
onMounted(loadCurrentMatch)
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Панель керування — Екран {{ screenId }}</h1>
        <p class="subtitle">Керування матчем та live preview</p>
      </div>

      <div class="header-actions">
        <RouterLink to="/screens">← Екрани</RouterLink>
        <RouterLink :to="`/screens/${screenId}/preview`">
          Попередній перегляд
        </RouterLink>
        <a :href="`${tvBaseUrl}/screens/${screenId}`" target="_blank" rel="noopener">
          Відкрити TV
        </a>
      </div>
    </div>

    <p v-if="loading">Завантаження...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <div v-else class="control-layout">
      <section class="card">
        <h2>{{ noMatch ? 'Створення матчу' : 'Налаштування матчу' }}</h2>

        <label>
          Назва команди 1
          <input v-model="team1Name" />
        </label>

        <label>
          Назва команди 2
          <input v-model="team2Name" />
        </label>

        <label>
          Сет
          <input v-model.number="currentSet" type="number" min="1" />
        </label>

        <label>
          Ігровий час
          <input v-model="periodTime" placeholder="00:00" />
        </label>

        <label v-if="!noMatch">
          Статус
          <select v-model="status">
            <option value="draft">Чернетка</option>
            <option value="live">Триває</option>
            <option value="paused">Пауза</option>
          </select>
        </label>

        <div class="row">
          <button v-if="noMatch" @click="createMatch" :disabled="saving">
            {{ saving ? 'Створення...' : 'Створити матч' }}
          </button>

          <button v-else @click="saveSettings" :disabled="saving">
            {{ saving ? 'Зберегти налаштування' : 'Зберегти налаштування' }}
          </button>
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>
        <p v-if="createErrorDetails" class="details-text">{{ createErrorDetails }}</p>
      </section>

      <section v-if="match" class="card">
        <h2>Керування матчем</h2>

        <div class="row controls-row">
          <button @click="startPeriod">Почати період</button>
          <button @click="pausePeriod">Пауза</button>
          <button @click="endPeriod">Завершити період</button>
          <button class="danger" @click="resetMatch">Скинути матч</button>
        </div>

        <div class="teams">
          <div class="team-box">
            <h3>{{ match.team1.name }}</h3>
            <p class="score">{{ match.team1.score }}</p>

            <div class="row">
              <button @click="changeScore(1, 1)">+1 очко</button>
              <button @click="changeScore(1, -1)">-1 очко</button>
            </div>

            <button @click="takeTimeout(1)">Таймаут команді 1</button>

            <div class="foul-box">
              <strong>Фоли</strong>
              <div class="row">
                <button @click="changeFouls(1, 1)">+1 фол</button>
                <button @click="changeFouls(1, -1)">-1 фол</button>
              </div>
            </div>
          <div class="team-box">
            <h3>{{ match.team2.name }}</h3>
            <p class="score">{{ match.team2.score }}</p>

            <div class="row">
              <button @click="changeScore(2, 1)">+1 очко</button>
              <button @click="changeScore(2, -1)">-1 очко</button>
            </div>

            <button @click="takeTimeout(2)">Таймаут команді 2</button>

          <div class="foul-box">
            <strong>Фоли</strong>
            <div class="row">
              <button @click="changeFouls(2, 1)">+1 фол</button>
              <button @click="changeFouls(2, -1)">-1 фол</button>
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Попередній перегляд</h2>

        <div class="preview">
          <div class="preview-team">
            <span class="preview-name">{{ team1Name }}</span>
            <strong class="preview-score">{{ match?.team1.score ?? 0 }}</strong>
            <small>Таймаути: {{ match?.team1.timeoutsUsed ?? 0 }}</small>
            <small>Фоли: {{ match?.team1.fouls ?? 0 }}</small>
          </div>

          <div class="preview-center">
            <strong>СЕТ {{ currentSet }}</strong>
            <span>{{ periodTime }}</span>
            <small>{{ match?.status ?? 'draft' }}</small>
          </div>

          <div class="preview-team">
            <span class="preview-name">{{ team2Name }}</span>
            <strong class="preview-score">{{ match?.team2.score ?? 0 }}</strong>
            <small>Таймаути: {{ match?.team2.timeoutsUsed ?? 0 }}</small>
            <small>Фоли: {{ match?.team2.fouls ?? 0 }}</small>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}
.header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.subtitle {
  opacity: 0.75;
  margin-top: 4px;
}
.header-actions {
  display: flex;
  gap: 12px;
}
.control-layout {
  display: grid;
  grid-template-columns: 320px 1fr 1fr;
  gap: 20px;
  align-items: start;
}
.card {
  background: #161b22;
  border: 1px solid #2b313c;
  border-radius: 16px;
  padding: 20px;
}
label {
  display: block;
  margin-bottom: 14px;
}
input,
select {
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #394150;
  background: #0f141b;
  color: #fff;
}
button {
  padding: 10px 14px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
button.danger {
  background: #dc2626;
}
.row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 12px;
}
.teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 16px;
}
.team-box {
  background: #0f141b;
  border: 1px solid #2b313c;
  border-radius: 14px;
  padding: 16px;
}
.score {
  font-size: 48px;
  font-weight: 800;
}
.foul-box {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #2b313c;
}
.preview {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}
.preview-team {
  text-align: center;
  display: grid;
  gap: 6px;
}
.preview-name {
  display: block;
  margin-bottom: 8px;
}
.preview-score {
  display: block;
  font-size: 42px;
}
.preview-center {
  text-align: center;
  display: grid;
  gap: 8px;
}
.error-text {
  color: #f87171;
}
.details-text {
  color: #fbbf24;
  margin-top: 8px;
  word-break: break-word;
}
.page {
  padding: 20px;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.control-layout {
  display: grid;
  grid-template-columns: 340px 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.card {
  background: linear-gradient(180deg, #111827 0%, #0f172a 100%);
  border: 1px solid #243041;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
}

button,
input,
select {
  min-height: 44px;
}

.teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.team-box {
  background: #0b1220;
  border: 1px solid #22314a;
  border-radius: 16px;
  padding: 16px;
}

@media (max-width: 1200px) {
  .control-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page {
    padding: 14px;
  }

  h1 {
    font-size: 34px;
    line-height: 1.1;
  }

  .row,
  .header-actions {
    flex-direction: column;
  }

  .teams {
    grid-template-columns: 1fr;
  }

  .preview {
    grid-template-columns: 1fr;
    gap: 18px;
  }

  .preview-center {
    order: -1;
  }
}
</style>