<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { createSocket } from '../services/socket'

type MatchState = {
  id: number
  screenId: number
  sportType: string
  status: string
  currentSet: number
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

const scoreboard = ref<MatchState | null>(null)
const socket = createSocket()

async function loadCurrentMatch() {
  const { data } = await api.get(`/screens/${screenId.value}/current`)
  scoreboard.value = data
}

onMounted(async () => {
  await loadCurrentMatch()

  socket.emit('screen:join', screenId.value)

  socket.on('match:updated', (payload: MatchState) => {
    scoreboard.value = payload
  })
})

onUnmounted(() => {
  socket.disconnect()
})
</script>

<template>
  <div class="tv-page" v-if="scoreboard">
    <div class="tv-team">
      <div class="tv-name">{{ scoreboard.team1.name }}</div>
      <div class="tv-score">{{ scoreboard.team1.score }}</div>
      <div class="tv-timeouts">TO: {{ scoreboard.team1.timeoutsUsed }}</div>
    </div>

    <div class="tv-center">
      <div class="tv-set">SET {{ scoreboard.currentSet }}</div>
      <div class="tv-time">{{ scoreboard.clock.time }}</div>
      <div class="tv-status">{{ scoreboard.status }}</div>
    </div>

    <div class="tv-team">
      <div class="tv-name">{{ scoreboard.team2.name }}</div>
      <div class="tv-score">{{ scoreboard.team2.score }}</div>
      <div class="tv-timeouts">TO: {{ scoreboard.team2.timeoutsUsed }}</div>
    </div>
  </div>
</template>