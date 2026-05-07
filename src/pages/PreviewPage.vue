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
  sportType: 'volleyball',

  team1: {
    name: 'TEAM 1',
    score: 0,
    fouls: 0,
    timeoutsUsed: 0,
  },

  team2: {
    name: 'TEAM 2',
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

  shotClock: {
    seconds: 24,
    isRunning: false,
    defaultSeconds: 24,
  },

  theme: {
    team1Color: '#67e8f9',
    team2Color: '#fda4af',
    fontFamily: 'system',
    boardStyle: 'neon',
  },

  setScores: {
    team1: [] as number[],
    team2: [] as number[],
  },
})
const displayedClock = ref('00:00')
const displayedShotClock = ref('24')
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

function applyScoreboard(payload: any) {
  const data = payload?.data ?? payload

  noMatch.value = false

  scoreboard.value = {
    team1: {
      name: data.team1?.name ?? scoreboard.value.team1.name,
      score: data.team1?.score ?? scoreboard.value.team1.score,
      fouls: data.team1?.fouls ?? scoreboard.value.team1.fouls,
      timeoutsUsed:
        data.team1?.timeoutsUsed ?? scoreboard.value.team1.timeoutsUsed,
    },

    team2: {
      name: data.team2?.name ?? scoreboard.value.team2.name,
      score: data.team2?.score ?? scoreboard.value.team2.score,
      fouls: data.team2?.fouls ?? scoreboard.value.team2.fouls,
      timeoutsUsed:
        data.team2?.timeoutsUsed ?? scoreboard.value.team2.timeoutsUsed,
    },

    currentSet:
      data.currentSet ?? scoreboard.value.currentSet,

    status:
      data.status ?? scoreboard.value.status,

    isActive:
      data.isActive ?? scoreboard.value.isActive,

    sportType:
      data.sportType ?? scoreboard.value.sportType,

    clock: {
      time:
        data.clock?.time ?? scoreboard.value.clock.time,

      isRunning:
        data.clock?.isRunning ??
        scoreboard.value.clock.isRunning,
    },

    shotClock: {
      seconds:
        data.shotClock?.seconds ??
        scoreboard.value.shotClock.seconds,

      isRunning:
        data.shotClock?.isRunning ??
        scoreboard.value.shotClock.isRunning,

      defaultSeconds:
        data.shotClock?.defaultSeconds ??
        scoreboard.value.shotClock.defaultSeconds,
    },

    theme: {
      team1Color:
        data.theme?.team1Color ??
        scoreboard.value.theme.team1Color,

      team2Color:
        data.theme?.team2Color ??
        scoreboard.value.theme.team2Color,

      fontFamily:
        data.theme?.fontFamily ??
        scoreboard.value.theme.fontFamily,

      boardStyle:
        data.theme?.boardStyle ??
        scoreboard.value.theme.boardStyle,
    },

    setScores: {
      team1: Array.isArray(data.setScores?.team1)
        ? data.setScores.team1
        : scoreboard.value.setScores.team1,

      team2: Array.isArray(data.setScores?.team2)
        ? data.setScores.team2
        : scoreboard.value.setScores.team2,
    },
  }

  displayedShotClock.value = String(
    data.shotClock?.seconds ?? 24
  ).padStart(2, '0')
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