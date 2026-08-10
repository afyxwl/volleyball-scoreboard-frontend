<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'
import ScoreboardDisplay from '../components/ScoreboardDisplay.vue'
type SportType = 'volleyball' | 'basketball'


type MatchState = {
  id?: number
  sportType: SportType
  currentSet: number
  status: string
  isActive: boolean
  serverNow?: string | null

 clock: {
  time: string | null
  isRunning: boolean
  startedAt?: string | null
}

  shotClock: {
    seconds: number
    isRunning: boolean
    defaultSeconds: number
  }

  theme: {
    team1Color: string
    team2Color: string
    fontFamily: 'system' | 'display' | 'mono'
    boardStyle: string
  }

  setScores: {
    team1: number[]
    team2: number[]
  }

  team1: {
    name: string
    score: number
    fouls: number
    timeoutsUsed: number
  }

  team2: {
    name: string
    score: number
    fouls: number
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
const sportType = ref<'volleyball' | 'basketball'>('volleyball')
const team1Color = ref('#67e8f9')
const team2Color = ref('#fda4af')
const fontFamily = ref<'system' | 'mono' | 'display'>('system')
const shotClockSeconds = ref(24)

const match = ref<MatchState | null>(null)

const team1Name = ref('КОМАНДА 1')
const team2Name = ref('КОМАНДА 2')
const currentSet = ref(1)
const periodTime = ref('00:00')
const status = ref<'draft' | 'live' | 'paused'>('draft')
const finishComment = ref('')
const displayedClock = ref('00:00')
const displayedShotClock = ref('24')
let timerId: number | null = null
let serverOffsetMs = 0
const previewScoreboard = computed<MatchState>(() => {
  return {
    id: match.value?.id,
    sportType: sportType.value,
    currentSet: currentSet.value,
    status: match.value?.status ?? status.value,
    isActive: match.value?.isActive ?? true,

   clock: {
  time: match.value?.clock?.time ?? periodTime.value,
  isRunning:
    match.value?.clock?.isRunning ?? false,
  startedAt:
    match.value?.clock?.startedAt ?? null,
},

    shotClock: {
      seconds: shotClockSeconds.value,
      isRunning: match.value?.shotClock?.isRunning ?? false,
      defaultSeconds: 24,
    },

    theme: {
      team1Color: team1Color.value,
      team2Color: team2Color.value,
      fontFamily: fontFamily.value,
      boardStyle: 'neon',
    },

    setScores: {
      team1: match.value?.setScores?.team1 ?? [],
      team2: match.value?.setScores?.team2 ?? [],
    },

    team1: {
      name: team1Name.value,
      score: match.value?.team1?.score ?? 0,
      fouls: match.value?.team1?.fouls ?? 0,
      timeoutsUsed: match.value?.team1?.timeoutsUsed ?? 0,
    },

    team2: {
      name: team2Name.value,
      score: match.value?.team2?.score ?? 0,
      fouls: match.value?.team2?.fouls ?? 0,
      timeoutsUsed: match.value?.team2?.timeoutsUsed ?? 0,
    },
  }
})


function parseClock(value: string) {
  const [mm, ss] = (value || '00:00').split(':').map(Number)
  return (mm || 0) * 60 + (ss || 0)
}

function formatClock(total: number) {
  const safe = Math.max(0, total)
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function stopTicker() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function updateDisplayedClock() {
  const clock = match.value?.clock

  if (!clock) {
    displayedClock.value = '00:00'
    return
  }

  const baseSeconds =
    parseClock(clock.time ?? '00:00')

  if (
    !clock.isRunning ||
    !clock.startedAt
  ) {
    displayedClock.value =
      formatClock(baseSeconds)

    return
  }

  const startedAtMs =
    new Date(clock.startedAt).getTime()

  const serverNowMs =
    Date.now() + serverOffsetMs

  const elapsedSeconds = Math.max(
    0,
    Math.floor(
      (serverNowMs - startedAtMs) / 1000
    )
  )

  if (match.value?.sportType === 'basketball') {
    displayedClock.value =
      formatClock(
        Math.max(0, baseSeconds - elapsedSeconds)
      )
  } else {
    displayedClock.value =
      formatClock(
        baseSeconds + elapsedSeconds
      )
  }
}

function startTicker() {
  stopTicker()

  updateDisplayedClock()

  if (
    !match.value?.clock?.isRunning ||
    !match.value?.clock?.startedAt
  ) {
    return
  }

  timerId = window.setInterval(() => {
    updateDisplayedClock()
  }, 250)
}


watch(
  () => [periodTime.value, status.value],
  () => startTicker(),
  { immediate: true }
)

onBeforeUnmount(() => {
  stopTicker()
})


function syncFormFromMatch(data: MatchState) {
  if (data.serverNow) {
  serverOffsetMs =
    new Date(data.serverNow).getTime() -
    Date.now()
}
  sportType.value = data.sportType ?? 'volleyball'
  team1Name.value = data.team1.name
  team2Name.value = data.team2.name
  currentSet.value = data.currentSet
  periodTime.value = data.clock.time ?? '00:00'
  status.value = (data.status as 'draft' | 'live' | 'paused') ?? 'draft'
  team1Color.value = data.theme?.team1Color ?? '#67e8f9'
  team2Color.value = data.theme?.team2Color ?? '#fda4af'
  fontFamily.value = (data.theme?.fontFamily as 'system' | 'mono' | 'display') ?? 'system'

  shotClockSeconds.value = data.shotClock?.seconds ?? 24
  displayedShotClock.value = String(data.shotClock?.seconds ?? 24).padStart(2, '0')
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
    const response = await api.patch(`/matches/${match.value.id}/fouls`, {
      team,
      delta,
      periodTime: displayedClock.value,
    })

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
    const response = await api.post(`/matches/${match.value.id}/pause-period`, {
      periodTime: displayedClock.value,
    })

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
    sportType: sportType.value,
    team1Name: team1Name.value.trim(),
    team2Name: team2Name.value.trim(),
    currentSet: currentSet.value,
    periodTime: periodTime.value,
    team1Color: team1Color.value,
    team2Color: team2Color.value,
    fontFamily: fontFamily.value,
    boardStyle: 'neon',
    shotClockSeconds: shotClockSeconds.value,
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
    const response = await api.patch(`/matches/${match.value.id}/score`, {
      team,
      delta,
      periodTime: displayedClock.value,
    })

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
    sportType: sportType.value,
    team1Name: team1Name.value.trim(),
    team2Name: team2Name.value.trim(),
    currentSet: currentSet.value,
    periodTime: periodTime.value,
    status: status.value,
    team1Color: team1Color.value,
    team2Color: team2Color.value,
    fontFamily: fontFamily.value,
    boardStyle: 'neon',
    shotClockSeconds: shotClockSeconds.value,
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
async function updateShotClock(seconds: number, isRunning?: boolean) {
  if (!match.value?.id) return

  try {
    const response = await api.patch(`/matches/${match.value.id}/shot-clock`, {
      seconds,
      isRunning,
      periodTime: displayedClock.value,
    })

    const payload = response.data?.data ?? response.data
    applyMatch(payload)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося оновити таймер атаки'
  }
}

async function takeTimeout(team: 1 | 2) {
  if (!match.value?.id) return

  try {
    const response = await api.patch(`/matches/${match.value.id}/timeout`, {
      team,
      periodTime: displayedClock.value,
    })

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
    const response = await api.post(`/matches/${match.value.id}/end-period`, {
      periodTime: displayedClock.value,
      comment: finishComment.value,
    })

    const payload = response.data?.data ?? response.data
    applyMatch(payload)
    finishComment.value = ''
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
        <RouterLink :to="`/screens/${screenId}/history`">
          Історія матчів
        </RouterLink>
        <RouterLink :to="`/screens/${screenId}/control/full`">
          Повноекранне керування
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
          Вид спорту
          <select v-model="sportType">
            <option value="volleyball">Волейбол</option>
            <option value="basketball">Баскетбол</option>
          </select>
        </label>

        <label>
          Назва команди 1
          <input v-model="team1Name" />
        </label>

        <label>
          Назва команди 2
          <input v-model="team2Name" />
        </label>

        <label>
          Сет / період
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

        <label v-if="match">
          Коментар до завершення матчу
          <textarea
            v-model="finishComment"
            placeholder="Наприклад: перемога команди Boot"
            rows="3"
          />
        </label>

        <div class="color-grid">
          <label>
            Колір команди 1
            <input v-model="team1Color" type="color" />
          </label>

          <label>
            Колір команди 2
            <input v-model="team2Color" type="color" />
          </label>
        </div>

        <label>
          Стиль шрифту табло
          <select v-model="fontFamily">
            <option value="system">Системний</option>
            <option value="display">Спортивний</option>
            <option value="mono">Моноширинний</option>
          </select>
        </label>

        <label v-if="sportType === 'basketball'">
          Таймер атаки, сек
          <input v-model.number="shotClockSeconds" type="number" min="0" max="99" />
        </label>

        <div class="row">
          <button v-if="noMatch" @click="createMatch" :disabled="saving">
            {{ saving ? 'Створення...' : 'Створити матч' }}
          </button>

          <button v-else @click="saveSettings" :disabled="saving">
            {{ saving ? 'Збереження...' : 'Зберегти налаштування' }}
          </button>
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>
        <p v-if="createErrorDetails" class="details-text">{{ createErrorDetails }}</p>
        </section>

  <section v-if="match" class="card">
  <h2>Керування матчем</h2>

  <!-- Загальне керування періодом / сетом -->
  <div class="row controls-row">
    <button @click="startPeriod">Почати період</button>
    <button @click="pausePeriod">Пауза</button>
    <button @click="endPeriod">Завершити період</button>
    <button class="danger" @click="resetMatch">Скинути матч</button>
  </div>

  <!-- Таймер атаки є тільки в баскетболі -->
  <div
    v-if="match.sportType === 'basketball'"
    class="foul-box"
  >
    <strong>Таймер атаки: {{ displayedShotClock }}</strong>

    <div class="row">
      <button @click="updateShotClock(24, true)">
        24 сек
      </button>

      <button @click="updateShotClock(14, true)">
        14 сек
      </button>

      <button @click="updateShotClock(shotClockSeconds, true)">
        Старт атаки
      </button>

      <button @click="updateShotClock(shotClockSeconds, false)">
        Пауза атаки
      </button>
    </div>
  </div>

  <div class="teams">

   
    <div class="team-box">
      <h3>{{ match.team1.name }}</h3>

      <p class="score">
        {{ match.team1.score }}
      </p>

      <!-- +1 / -1 є в обох видах спорту -->
      <div class="row">
        <button @click="changeScore(1, 1)">
          +1 очко
        </button>

        <button @click="changeScore(1, -1)">
          -1 очко
        </button>
      </div>

      <!-- +2 та +3 тільки для баскетболу -->
      <button
        v-if="match.sportType === 'basketball'"
        @click="changeScore(1, 2)"
      >
        +2 очки
      </button>

      <button
        v-if="match.sportType === 'basketball'"
        @click="changeScore(1, 3)"
      >
        +3 очки
      </button>

      <!-- Таймаут є і у волейболі, і у баскетболі -->
      <button @click="takeTimeout(1)">
        Таймаут команді 1
      </button>

      <!-- Фоли ТІЛЬКИ для баскетболу -->
      <div
        v-if="match.sportType === 'basketball'"
        class="foul-box"
      >
        <strong>
          Фоли: {{ match.team1.fouls ?? 0 }}
        </strong>

        <div class="row">
          <button @click="changeFouls(1, 1)">
            +1 фол
          </button>

          <button @click="changeFouls(1, -1)">
            -1 фол
          </button>
        </div>
      </div>
    </div>

    <!-- КОМАНДА 2 -->
    <div class="team-box">
      <h3>{{ match.team2.name }}</h3>

      <p class="score">
        {{ match.team2.score }}
      </p>

      <!-- +1 / -1 є в обох видах спорту -->
      <div class="row">
        <button @click="changeScore(2, 1)">
          +1 очко
        </button>

        <button @click="changeScore(2, -1)">
          -1 очко
        </button>
      </div>

      <!-- +2 та +3 тільки для баскетболу -->
      <button
        v-if="match.sportType === 'basketball'"
        @click="changeScore(2, 2)"
      >
        +2 очки
      </button>

      <button
        v-if="match.sportType === 'basketball'"
        @click="changeScore(2, 3)"
      >
        +3 очки
      </button>

      <!-- Таймаут є і у волейболі, і у баскетболі -->
      <button @click="takeTimeout(2)">
        Таймаут команді 2
      </button>

      <!-- Фоли ТІЛЬКИ для баскетболу -->
      <div
        v-if="match.sportType === 'basketball'"
        class="foul-box"
      >
        <strong>
          Фоли: {{ match.team2.fouls ?? 0 }}
        </strong>

        <div class="row">
          <button @click="changeFouls(2, 1)">
            +1 фол
          </button>

          <button @click="changeFouls(2, -1)">
            -1 фол
          </button>
        </div>
      </div>
    </div>

  </div>
</section>

      <section class="card">
        <h2>Попередній перегляд</h2>

        <div class="preview">
          <ScoreboardDisplay
            :scoreboard="previewScoreboard"
            :displayed-clock="displayedClock"
            :displayed-shot-clock="displayedShotClock"
            preview
          />
        </div>
      </section>
    </div>
  </div>
</template>


<style scoped>
.page {
  min-height: 100vh;
  padding: 32px;
  background:
    radial-gradient(circle at 20% 10%, rgba(34, 211, 238, 0.08), transparent 28%),
    radial-gradient(circle at 85% 20%, rgba(251, 113, 133, 0.08), transparent 28%),
    #03050a;
  color: #f8fafc;
}

.header {
  max-width: 1280px;
  margin: 0 auto 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
}

h1 {
  font-size: clamp(36px, 5vw, 66px);
  line-height: 1;
  font-weight: 900;
  margin: 0;
}

.subtitle {
  color: #94a3b8;
  font-size: 18px;
  margin-top: 12px;
  text-align: center;
}

.header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.header-actions a {
  min-height: 42px;
  padding: 10px 14px;
  border-radius: 12px;
  border: 2px solid #22d3ee;
  color: #e0f2fe;
  background: rgba(34, 211, 238, 0.08);
  font-weight: 800;
  text-decoration: none;
}

.header-actions a:hover {
  background: rgba(34, 211, 238, 0.18);
}

.control-layout {
  max-width: 1280px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 340px 1fr 350px;
  gap: 20px;
  align-items: start;
}

.card {
  background: linear-gradient(145deg, rgba(8, 13, 25, 0.98), rgba(15, 23, 42, 0.96));
  border: 2px solid rgba(34, 211, 238, 0.22);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.card h2 {
  margin: 0 0 20px;
  font-size: 26px;
  text-align: center;
}

label {
  display: block;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}

input,
select,
textarea {
  width: 100%;
  margin-top: 8px;
  min-height: 48px;
  padding: 12px 14px;
  border-radius: 14px;
  border: 2px solid rgba(148, 163, 184, 0.35);
  background: #05070d;
  color: #f8fafc;
  font-weight: 700;
  outline: none;
}

textarea {
  resize: vertical;
}

input:focus,
select:focus,
textarea:focus {
  border-color: #22d3ee;
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.15);
}

button {
  min-height: 48px;
  padding: 12px 16px;
  border-radius: 14px;
  border: 2px solid #22d3ee;
  background: rgba(34, 211, 238, 0.12);
  color: #f8fafc;
  font-weight: 900;
  cursor: pointer;
}

button:hover {
  background: rgba(34, 211, 238, 0.24);
}

button.danger {
  border-color: #fb7185;
  background: rgba(251, 113, 133, 0.18);
}

button.danger:hover {
  background: rgba(251, 113, 133, 0.3);
}

button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: center;
}

.controls-row {
  margin-bottom: 18px;
}

.teams {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.team-box {
  background: rgba(3, 7, 18, 0.95);
  border: 2px solid rgba(148, 163, 184, 0.22);
  border-radius: 22px;
  padding: 18px;
  text-align: center;
}

.team-box:first-child {
  border-color: rgba(34, 211, 238, 0.45);
}

.team-box:last-child {
  border-color: rgba(251, 113, 133, 0.45);
}

.team-box h3 {
  margin: 0;
  font-size: 26px;
  text-transform: uppercase;
}

.score {
  margin: 14px 0;
  font-size: 64px;
  line-height: 1;
  font-weight: 1000;
}

.team-box:first-child .score {
  color: #67e8f9;
}

.team-box:last-child .score {
  color: #fda4af;
}

.foul-box {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid rgba(148, 163, 184, 0.25);
}

.foul-box strong {
  display: block;
  margin-bottom: 12px;
  font-size: 20px;
}

.preview {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 14px;
  align-items: center;
}

.preview-team {
  display: grid;
  gap: 6px;
  text-align: center;
}

.preview-name {
  font-size: 18px;
  font-weight: 900;
  text-transform: uppercase;
}

.preview-score {
  font-size: 48px;
  line-height: 1;
}

.preview-center {
  display: grid;
  gap: 6px;
  text-align: center;
  min-width: 90px;
}

.preview-center strong {
  font-size: 20px;
}

.preview-center span {
  font-size: 24px;
  font-weight: 900;
}

.preview small {
  color: #e2e8f0;
}

.error-text {
  color: #fb7185;
  text-align: center;
  font-weight: 900;
}

.details-text {
  color: #fbbf24;
text-align: center;
  word-break: break-word;
}

@media (max-width: 1180px) {
  .control-layout {
    grid-template-columns: 1fr;
  }

  .card {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .page {
    padding: 18px;
  }

  .header {
    display: block;
  }

  .subtitle {
    text-align: left;
  }

  .header-actions {
    margin-top: 18px;
    display: grid;
    grid-template-columns: 1fr;
  }

  .header-actions a,
  button {
    width: 100%;
  }

  .teams {
    grid-template-columns: 1fr;
  }

  .preview {
    grid-template-columns: 1fr;
  }

  .preview-center {
    order: -1;
  }

  .score {
    font-size: 76px;
  }
}
</style>