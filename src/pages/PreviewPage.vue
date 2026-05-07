<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { createSocket } from '../services/socket'
import ScoreboardDisplay from '../components/ScoreboardDisplay.vue' 

const route = useRoute()
const screenId = route.params.id

const loading = ref(true)
const error = ref('')
const noMatch = ref(false)
const socket = createSocket()

const scoreboard = ref({
  team1: {
    name: 'КОМАНДА 1',
    score: 0,
    fouls: 0,
    timeoutsUsed: 0,
  },
  team2: {
    name: 'КОМАНДА 2',
    score: 0,
    fouls: 0,
    timeoutsUsed: 0,
  },
  currentSet: 1,
  status: 'draft',
  isActive: false,
  clock: {
    time: '00:00',
    isRunning: false,
  },
})

const displayedClock = ref('00:00')
let timerId: number | null = null

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

function startTicker() {
  stopTicker()

  let seconds = parseClock(scoreboard.value.clock.time || '00:00')
  displayedClock.value = formatClock(seconds)

  if (scoreboard.value.status !== 'live') return

  timerId = window.setInterval(() => {
    seconds += 1
    displayedClock.value = formatClock(seconds)
  }, 1000)
}

watch(
  () => [scoreboard.value.clock.time, scoreboard.value.status],
  () => startTicker(),
  { immediate: true }
)

function mapStatus(status: string) {
  if (status === 'live') return 'Триває'
  if (status === 'paused') return 'Пауза'
  if (status === 'finished') return 'Завершено'
  return 'Чернетка'
}

function applyScoreboard(payload: any) {
  const data = payload?.data ?? payload
  noMatch.value = false

  scoreboard.value = {
    team1: {
      name: data.team1?.name ?? scoreboard.value.team1.name,
      score: data.team1?.score ?? scoreboard.value.team1.score,
      fouls: data.team1?.fouls ?? scoreboard.value.team1.fouls,
      timeoutsUsed: data.team1?.timeoutsUsed ?? scoreboard.value.team1.timeoutsUsed,
    },
    team2: {
      name: data.team2?.name ?? scoreboard.value.team2.name,
      score: data.team2?.score ?? scoreboard.value.team2.score,
      fouls: data.team2?.fouls ?? scoreboard.value.team2.fouls,
      timeoutsUsed: data.team2?.timeoutsUsed ?? scoreboard.value.team2.timeoutsUsed,
    },
    currentSet: data.currentSet ?? scoreboard.value.currentSet,
    status: data.status ?? scoreboard.value.status,
    isActive: data.isActive ?? scoreboard.value.isActive,
    clock: {
      time: data.clock?.time ?? scoreboard.value.clock.time,
      isRunning: data.clock?.isRunning ?? scoreboard.value.clock.isRunning,
    },
  }
}

async function loadCurrentState() {
  try {
    loading.value = true
    error.value = ''
    noMatch.value = false

    const response = await api.get(`/screens/${screenId}/current`)
    applyScoreboard(response.data)
  } catch (err: any) {
    if (err.response?.status === 404) {
      noMatch.value = true
      error.value = ''
    } else {
      console.error(err)
      error.value = 'Не вдалося завантажити попередній перегляд'
    }
  } finally {
    loading.value = false
  }
}

const handleUpdated = (payload: any) => {
  applyScoreboard(payload)
}

onMounted(async () => {
  await loadCurrentState()

  socket.emit('screen:join', { screenId })
  socket.emit('screen:join', Number(screenId))

  socket.on('match:updated', handleUpdated)
  socket.on('match.updated', handleUpdated)
})

onBeforeUnmount(() => {
  stopTicker()
  socket.off('match:updated', handleUpdated)
  socket.off('match.updated', handleUpdated)
  socket.disconnect()
})
</script>

 <template>
  <div class="preview-page">
    <div v-if="loading" class="message">
      Завантаження...
    </div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <div v-else-if="noMatch" class="message">
      Попередній перегляд недоступний: немає активного матчу
    </div>

    <ScoreboardDisplay
      v-else
      :scoreboard="scoreboard"
      :displayed-clock="displayedClock"
      :displayed-shot-clock="displayedShotClock"
    />
  </div>
</template>

<style scoped>
.preview-page {
  min-height: 100vh;
  background: #0f1115;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.message {
  text-align: center;
  font-size: 28px;
}
.error {
  color: #f87171;
}
.scoreboard {
  width: 100%;
  max-width: 1700px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 40px;
  align-items: center;
}
.team {
  text-align: center;
}
.team-name {
  font-size: 52px;
  font-weight: 700;
  margin-bottom: 24px;
}
.team-score {
  font-size: 180px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 20px;
}
.meta {
  font-size: 28px;
  margin-top: 8px;
}
.center {
  text-align: center;
}
.set {
  font-size: 42px;
  margin-bottom: 20px;
}
.clock {
  font-size: 84px;
  font-weight: 800;
  margin-bottom: 18px;
}
.status {
  font-size: 28px;
  opacity: 0.85;
}
<style scoped>
.preview-page {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #03050a;
}

.message {
  width: 100vw;
  height: 100dvh;
  display: grid;
  place-items: center;
  color: #f8fafc;
  background: #03050a;
  font-size: clamp(28px, 4vw, 58px);
  font-weight: 900;
}

.error {
  color: #fb7185;
}
</style>