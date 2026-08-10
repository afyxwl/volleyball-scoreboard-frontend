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
let gameTimerId: number | null = null
let shotTimerId: number | null = null

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

function formatShotClock(total: number) {
  return String(Math.max(0, total)).padStart(2, '0')
}

function stopGameTicker() {
  if (gameTimerId !== null) {
    clearInterval(gameTimerId)
    gameTimerId = null
  }
}

function stopShotTicker() {
  if (shotTimerId !== null) {
    clearInterval(shotTimerId)
    shotTimerId = null
  }
}
function startGameTicker() {
  stopGameTicker()

  let seconds = parseClock(displayedClock.value)

  if (match.value?.status !== 'live') {
    return
  }

  gameTimerId = window.setInterval(() => {
    if (match.value?.sportType === 'basketball') {
      seconds = Math.max(0, seconds - 1)
    } else {
      seconds += 1
    }

    displayedClock.value = formatClock(seconds)

    if (
      match.value?.sportType === 'basketball' &&
      seconds === 0
    ) {
      stopGameTicker()
    }
  }, 1000)
}
function startShotTicker() {
  stopShotTicker()

  let seconds = Number(displayedShotClock.value || 24)

  if (
    match.value?.sportType !== 'basketball' ||
    match.value?.status !== 'live' ||
    !match.value?.shotClock?.isRunning
  ) {
    return
  }

  shotTimerId = window.setInterval(() => {
    seconds = Math.max(0, seconds - 1)

    displayedShotClock.value = formatShotClock(seconds)

    if (seconds === 0) {
      stopShotTicker()
    }
  }, 1000)
}


async function loadCurrentMatch() {
  try {
    loading.value = true
    const response = await api.get(`/screens/${screenId.value}/current`)
    match.value = response.data?.data ?? response.data
    displayedClock.value = match.value?.clock?.time ?? '00:00'
    displayedShotClock.value = String(match.value?.shotClock?.seconds ?? 24).padStart(2, '0')
  startGameTicker()
  startShotTicker()
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

  displayedClock.value =
    data?.clock?.time ??
    displayedClock.value

  displayedShotClock.value = String(
    data?.shotClock?.seconds ?? 24
  ).padStart(2, '0')

  startGameTicker()
  startShotTicker()
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
  stopGameTicker()
  stopShotTicker()

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

                      <button
            v-if="match.sportType === 'basketball'"
            @click="changeFouls(1, 1)"
          >
            + фол
          </button>

          <button
            v-if="match.sportType === 'basketball'"
            @click="changeFouls(1, -1)"
          >
            - фол
          </button>
          </div>

                <p v-if="match.sportType === 'basketball'">
        Таймаути: {{ match.team1.timeoutsUsed }} |
        Фоли: {{ match.team1.fouls }}
      </p>

      <p v-else>
        Таймаути: {{ match.team1.timeoutsUsed }}
      </p>
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

                      <button
            v-if="match.sportType === 'basketball'"
            @click="changeFouls(2, 1)"
          >
            + фол
          </button>

          <button
            v-if="match.sportType === 'basketball'"
            @click="changeFouls(2, -1)"
          >
            - фол
          </button>
          </div>

                <p v-if="match.sportType === 'basketball'">
        Таймаути: {{ match.team2.timeoutsUsed }} |
        Фоли: {{ match.team2.fouls }}
      </p>

      <p v-else>
        Таймаути: {{ match.team2.timeoutsUsed }}
      </p>
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

@media (max-height: 600px) and (orientation: landscape) {
  .full-control {
    width: 100vw;
    height: 100dvh;
    padding: 6px 10px;
    overflow: hidden;
  }

  .topbar {
    height: 54px;
    grid-template-columns: 120px 1fr 130px;
    gap: 8px;
  }

  .topbar a {
    padding: 8px 10px;
    border-radius: 12px;
    font-size: 14px;
  }

  h1 {
    display: none;
  }

  .topbar p {
    margin: 0;
    font-size: 18px;
    color: #f8fafc;
  }

  .timer-box strong {
    font-size: 26px;
  }

  .timer-box span {
    font-size: 12px;
  }

  .period-controls {
    height: 50px;
    margin-bottom: 6px;
    gap: 6px;
  }

  .period-controls button {
    min-height: 0;
    font-size: 16px;
    border-radius: 12px;
  }

  .teams-grid {
    height: calc(100dvh - 122px);
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .team-panel {
    padding: 7px 10px;
    border-radius: 16px;
  }

  .team-panel h2 {
    font-size: clamp(16px, 4vw, 25px);
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .big-score {
    font-size: clamp(48px, 12vh, 82px);
    line-height: 0.85;
    margin: 3px 0 5px;
  }

  .button-grid {
    gap: 5px;
  }

  .button-grid button {
    min-height: 0;
    font-size: 14px;
    border-radius: 10px;
    padding: 4px;
  }

  .team-panel p {
    margin-top: 4px;
    font-size: 13px;
  }

  .shot-controls {
    position: absolute;
    bottom: 3px;
    left: 50%;
    gap: 5px;
  }

  .shot-controls button {
    min-width: 75px;
    min-height: 28px;
    padding: 3px 6px;
    font-size: 12px;
  }
}
</style>