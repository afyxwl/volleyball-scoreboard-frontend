<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '../services/api'
import { createSocket } from '../services/socket'

const route = useRoute()
const screenId = computed(() => Number(route.params.id))
const socket = createSocket()

const match = ref<any>(null)
const loading = ref(true)
const error = ref('')
const displayedClock = ref('00:00')
const displayedShotClock = ref('24')

async function loadCurrentMatch() {
  try {
    loading.value = true
    const response = await api.get(`/screens/${screenId.value}/current`)
    match.value = response.data?.data ?? response.data
    displayedClock.value = match.value?.clock?.time ?? '00:00'
    displayedShotClock.value = String(match.value?.shotClock?.seconds ?? 24).padStart(2, '0')
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити матч'
  } finally {
    loading.value = false
  }
}

function applyMatch(payload: any) {
  const data = payload?.data ?? payload
  match.value = data
  displayedClock.value = data?.clock?.time ?? displayedClock.value
  displayedShotClock.value = String(data?.shotClock?.seconds ?? 24).padStart(2, '0')
}

async function changeScore(team: 1 | 2, delta: number) {
  if (!match.value?.id) return

  const response = await api.patch(`/matches/${match.value.id}/score`, {
    team,
    delta,
    periodTime: displayedClock.value,
  })

  applyMatch(response.data)
}

async function changeTimeout(team: 1 | 2, delta: number) {
  if (!match.value?.id) return

  const response = await api.patch(`/matches/${match.value.id}/timeout`, {
    team,
    delta,
    periodTime: displayedClock.value,
  })

  applyMatch(response.data)
}

async function changeFouls(team: 1 | 2, delta: number) {
  if (!match.value?.id) return

  const response = await api.patch(`/matches/${match.value.id}/fouls`, {
    team,
    delta,
    periodTime: displayedClock.value,
  })

  applyMatch(response.data)
}

async function startPeriod() {
  if (!match.value?.id) return
  const response = await api.post(`/matches/${match.value.id}/start-period`)
  applyMatch(response.data)
}

async function pausePeriod() {
  if (!match.value?.id) return

  const response = await api.post(`/matches/${match.value.id}/pause-period`, {
    periodTime: displayedClock.value,
  })

  applyMatch(response.data)
}

async function endPeriod() {
  if (!match.value?.id) return

  const response = await api.post(`/matches/${match.value.id}/end-period`, {
    periodTime: displayedClock.value,
  })

  applyMatch(response.data)
}

async function updateShotClock(seconds: number, isRunning?: boolean) {
  if (!match.value?.id) return

  const response = await api.patch(`/matches/${match.value.id}/shot-clock`, {
    seconds,
    isRunning,
    periodTime: displayedClock.value,
  })

  applyMatch(response.data)
}

onMounted(async () => {
  await loadCurrentMatch()

  socket.emit('screen:join', { screenId: screenId.value })
  socket.on('match:updated', applyMatch)
  socket.on('match.updated', applyMatch)
})

onBeforeUnmount(() => {
  socket.off('match:updated', applyMatch)
  socket.off('match.updated', applyMatch)
  socket.disconnect()
})
</script>
<template>
  <main class="full-control">
    <div v-if="loading" class="state">Завантаження...</div>
    <div v-else-if="error" class="state error">{{ error }}</div>

    <template v-else-if="match">
      <header class="topbar">
        <RouterLink :to="`/screens/${screenId}/control`">← Назад</RouterLink>

        <div>
          <h1>Керування матчем</h1>
          <p>{{ match.sportType === 'basketball' ? 'Баскетбол' : 'Волейбол' }}</p>
        </div>

        <div class="timer-box">
          <strong>{{ displayedClock }}</strong>
          <span v-if="match.sportType === 'basketball'">Атака: {{ displayedShotClock }}</span>
        </div>
      </header>

      <section class="period-controls">
        <button @click="startPeriod">Старт</button>
        <button @click="pausePeriod">Пауза</button>
        <button @click="endPeriod">Завершити період</button>
      </section>

      <section class="teams-grid">
        <article class="team-panel team-one">
          <h2>{{ match.team1.name }}</h2>
          <div class="big-score">{{ match.team1.score }}</div>

          <div class="button-grid">
            <button @click="changeScore(1, 1)">+1</button>
            <button @click="changeScore(1, -1)">-1</button>

            <button v-if="match.sportType === 'basketball'" @click="changeScore(1, 2)">+2</button>
            <button v-if="match.sportType === 'basketball'" @click="changeScore(1, 3)">+3</button>

            <button @click="changeTimeout(1, 1)">+ таймаут</button>
            <button @click="changeTimeout(1, -1)">- таймаут</button>

            <button @click="changeFouls(1, 1)">+ фол</button>
            <button @click="changeFouls(1, -1)">- фол</button>
          </div>

          <p>Таймаути: {{ match.team1.timeoutsUsed }} | Фоли: {{ match.team1.fouls }}</p>
        </article>

        <article class="team-panel team-two">
          <h2>{{ match.team2.name }}</h2>
          <div class="big-score">{{ match.team2.score }}</div>

          <div class="button-grid">
            <button @click="changeScore(2, 1)">+1</button>
            <button @click="changeScore(2, -1)">-1</button>

            <button v-if="match.sportType === 'basketball'" @click="changeScore(2, 2)">+2</button>
            <button v-if="match.sportType === 'basketball'" @click="changeScore(2, 3)">+3</button>

            <button @click="changeTimeout(2, 1)">+ таймаут</button>
            <button @click="changeTimeout(2, -1)">- таймаут</button>

            <button @click="changeFouls(2, 1)">+ фол</button>
            <button @click="changeFouls(2, -1)">- фол</button>
          </div>

          <p>Таймаути: {{ match.team2.timeoutsUsed }} | Фоли: {{ match.team2.fouls }}</p>
        </article>
      </section>

      <section v-if="match.sportType === 'basketball'" class="shot-controls">
        <button @click="updateShotClock(24, true)">24 сек</button>
        <button @click="updateShotClock(14, true)">14 сек</button>
        <button @click="updateShotClock(Number(displayedShotClock), false)">Пауза атаки</button>
      </section>
    </template>
  </main>
</template>
<style scoped>
.full-control {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  padding: 18px;
  box-sizing: border-box;
  background:
    radial-gradient(circle at 20% 10%, rgba(34, 211, 238, 0.1), transparent 28%),
    radial-gradient(circle at 85% 20%, rgba(251, 113, 133, 0.1), transparent 28%),
    #03050a;
  color: #f8fafc;
}

.topbar {
  height: 90px;
  display: grid;
  grid-template-columns: 180px 1fr 220px;
  align-items: center;
  gap: 16px;
}

.topbar a,
button {
  border: 2px solid #22d3ee;
  background: rgba(34, 211, 238, 0.12);
  color: #f8fafc;
  border-radius: 18px;
  font-weight: 1000;
  text-decoration: none;
  cursor: pointer;
}

.topbar a {
  padding: 18px;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: clamp(30px, 4vw, 56px);
  text-align: center;
}

.topbar p {
  margin: 4px 0 0;
  color: #94a3b8;
  text-align: center;
  font-weight: 900;
}

.timer-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.timer-box strong {
  font-size: 36px;
}

.timer-box span {
  color: #facc15;
  font-weight: 900;
}

.period-controls {
  height: 78px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 16px;
}

.period-controls button {
  font-size: clamp(20px, 2vw, 30px);
}

.teams-grid {
  height: calc(100dvh - 230px);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.team-panel {
  min-height: 0;
  padding: 18px;
  border-radius: 28px;
  background: rgba(3, 7, 18, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.team-one {
  border: 3px solid #22d3ee;
}

.team-two {
  border: 3px solid #fb7185;
}

.team-panel h2 {
  margin: 0;
  font-size: clamp(28px, 4vw, 64px);
  line-height: 1;
  text-align: center;
  text-transform: uppercase;
}

.big-score {
  font-size: clamp(80px, 12vw, 170px);
  line-height: 0.9;
  font-weight: 1000;
  margin: 10px 0 18px;
}

.team-one .big-score {
  color: #67e8f9;
}

.team-two .big-score {
  color: #fda4af;
}

.button-grid {
  width: 100%;
  flex: 1;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  min-height: 0;
}

.button-grid button {
  font-size: clamp(18px, 2.1vw, 32px);
  min-height: 64px;
}

.team-panel p {
  margin: 12px 0 0;
  font-size: clamp(18px, 2vw, 28px);
  font-weight: 900;
}

.shot-controls {
  position: fixed;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  display: flex;
  gap: 12px;
}

.shot-controls button {
  min-width: 140px;
  min-height: 54px;
}

.state {
  height: 100%;
  display: grid;
  place-items: center;
  font-size: 42px;
  font-weight: 1000;
}

.error {
  color: #fb7185;
}

@media (max-width: 900px) {
  .topbar {
    grid-template-columns: 1fr;
    height: auto;
  }

  .teams-grid {
    grid-template-columns: 1fr;
    height: auto;
  }

  .full-control {
    overflow: auto;
  }
}
</style>