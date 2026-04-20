<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
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

const loading = ref(true)
const error = ref('')
const formError = ref('')
const saving = ref(false)
const noMatch = ref(false)

const match = ref<MatchState | null>(null)

const team1Name = ref('TEAM A')
const team2Name = ref('TEAM B')
const currentSet = ref(1)
const periodTime = ref('00:00')
const status = ref<'draft' | 'live' | 'paused'>('draft')

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
    formError.value = 'Номер партії має бути не менше 1'
    return false
  }
  if (!/^\d{2}:\d{2}$/.test(periodTime.value)) {
    formError.value = 'Час має бути у форматі MM:SS'
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

    const { data } = await api.get(`/screens/${screenId.value}/current`)
    applyMatch(data)
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

async function createMatch() {
  if (!validateForm()) return

  try {
    saving.value = true

    const { data } = await api.post('/matches', {
      screenId: screenId.value,
      sportType: 'volleyball',
      team1Name: team1Name.value.trim(),
      team2Name: team2Name.value.trim(),
      currentSet: currentSet.value,
      periodTime: periodTime.value,
    })

    applyMatch(data)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося створити матч'
  } finally {
    saving.value = false
  }
}

async function changeScore(team: 1 | 2, delta: number) {
  if (!match.value?.id) return

  try {
    const { data } = await api.patch(`/matches/${match.value.id}/score`, { team, delta })
    applyMatch(data)
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

    const { data } = await api.patch(`/matches/${match.value.id}/settings`, {
      team1Name: team1Name.value.trim(),
      team2Name: team2Name.value.trim(),
      currentSet: currentSet.value,
      periodTime: periodTime.value,
      status: status.value,
    })

    applyMatch(data)
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
    const { data } = await api.patch(`/matches/${match.value.id}/timeout`, { team })
    applyMatch(data)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося зарахувати таймаут'
  }
}

async function startPeriod() {
  if (!match.value?.id) return

  try {
    const { data } = await api.post(`/matches/${match.value.id}/start-period`)
    applyMatch(data)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося почати період'
  }
}

async function endPeriod() {
  if (!match.value?.id) return

  try {
    const { data } = await api.post(`/matches/${match.value.id}/end-period`)
    applyMatch(data)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося завершити період'
  }
}

async function resetMatch() {
  if (!match.value?.id) return
  if (!window.confirm('Справді скинути матч?')) return

  try {
    const { data } = await api.post(`/matches/${match.value.id}/reset`)
    applyMatch(data)
  } catch (err) {
    console.error(err)
    formError.value = 'Не вдалося скинути матч'
  }
}

onMounted(loadCurrentMatch)
</script>

<template>
  <div class="page">
    <h1>Control Panel — Screen {{ screenId }}</h1>

    <p v-if="loading">Завантаження...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <div v-else class="control-layout">
      <section class="card">
        <h2>{{ noMatch ? 'Створення матчу' : 'Налаштування матчу' }}</h2>

        <label>
          Team 1
          <input v-model="team1Name" />
        </label>

        <label>
          Team 2
          <input v-model="team2Name" />
        </label>

        <label>
          Set
          <input v-model.number="currentSet" type="number" min="1" />
        </label>

        <label>
          Time
          <input v-model="periodTime" placeholder="00:00" />
        </label>

        <label v-if="!noMatch">
          Status
          <select v-model="status">
            <option value="draft">draft</option>
            <option value="live">live</option>
            <option value="paused">paused</option>
          </select>
        </label>

        <div class="row">
          <button v-if="noMatch" @click="createMatch" :disabled="saving">
            {{ saving ? 'Створення...' : 'Створити матч' }}
          </button>

          <button v-else @click="saveSettings" :disabled="saving">
            {{ saving ? 'Збереження...' : 'Зберегти' }}
          </button>
        </div>

        <p v-if="formError" class="error-text">{{ formError }}</p>
      </section>

      <section v-if="match" class="card">
        <h2>Керування матчем</h2>

        <div class="row controls-row">
          <button @click="startPeriod">Start period</button>
          <button @click="endPeriod">End period</button>
          <button class="danger" @click="resetMatch">Reset match</button>
        </div>

        <div class="teams">
          <div class="team-box">
            <h3>{{ match.team1.name }}</h3>
            <p class="score">{{ match.team1.score }}</p>
            <div class="row">
              <button @click="changeScore(1, 1)">+1</button>
              <button @click="changeScore(1, -1)">-1</button>
            </div>
            <button @click="takeTimeout(1)">Timeout Team 1</button>
          </div>

          <div class="team-box">
            <h3>{{ match.team2.name }}</h3>
            <p class="score">{{ match.team2.score }}</p>
            <div class="row">
              <button @click="changeScore(2, 1)">+1</button>
              <button @click="changeScore(2, -1)">-1</button>
            </div>
            <button @click="takeTimeout(2)">Timeout Team 2</button>
          </div>
        </div>
      </section>

      <section class="card">
        <h2>Preview</h2>

        <div class="preview">
          <div class="preview-team">
            <span class="preview-name">{{ team1Name }}</span>
            <strong class="preview-score">{{ match?.team1.score ?? 0 }}</strong>
            <small>TO: {{ match?.team1.timeoutsUsed ?? 0 }}</small>
          </div>

          <div class="preview-center">
            <strong>SET {{ currentSet }}</strong>
            <span>{{ periodTime }}</span>
            <small>{{ match?.status ?? 'draft' }}</small>
          </div>

          <div class="preview-team">
            <span class="preview-name">{{ team2Name }}</span>
            <strong class="preview-score">{{ match?.team2.score ?? 0 }}</strong>
            <small>TO: {{ match?.team2.timeoutsUsed ?? 0 }}</small>
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
  font-size: 14px;
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
.preview {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 12px;
  align-items: center;
}
.preview-team {
  text-align: center;
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
}
.error-text {
  color: #f87171;
}
</style>