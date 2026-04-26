<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const matchId = route.params.id

const loading = ref(true)
const error = ref('')
const events = ref<any[]>([])

function getPayload(event: any) {
  const payload = event.payloadJson ?? event.payload_json ?? event.payload ?? {}
  if (typeof payload === 'string') {
    try {
      return JSON.parse(payload)
    } catch {
      return {}
    }
  }
  return payload
}

function eventTitle(type: string) {
  const map: Record<string, string> = {
    'match.created': 'Матч створено',
    'match.score_updated': 'Змінено рахунок',
    'match.fouls_updated': 'Змінено фоли',
    'match.timeout_used': 'Взято таймаут',
    'match.period_started': 'Період розпочато',
    'match.period_paused': 'Період поставлено на паузу',
    'match.period_finished': 'Період завершено',
    'match.reset': 'Матч скинуто',
  }

  return map[type] ?? type
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('uk-UA')
}

async function loadHistory() {
  try {
    loading.value = true
    error.value = ''

    const response = await api.get(`/matches/${matchId}/history`)
    events.value = response.data?.data ?? response.data ?? []
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити історію матчу'
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <main class="page">
    <RouterLink to="/screens" class="back">← Назад до екранів</RouterLink>

    <h1>Історія матчу #{{ matchId }}</h1>

    <p v-if="loading">Завантаження...</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else-if="events.length === 0" class="empty">
      Історія цього матчу поки порожня
    </div>

    <div v-else class="list">
      <article v-for="event in events" :key="event.id" class="card">
        <div class="card-header">
          <h2>{{ eventTitle(event.eventType ?? event.event_type) }}</h2>
          <span>{{ formatDate(event.createdAt ?? event.created_at) }}</span>
        </div>

        <div class="details">
          <p v-if="getPayload(event).comment">
            <strong>Коментар:</strong> {{ getPayload(event).comment }}
          </p>

          <p v-if="getPayload(event).periodTime">
            <strong>Час:</strong> {{ getPayload(event).periodTime }}
          </p>

          <p v-if="getPayload(event).currentSet">
            <strong>Сет:</strong> {{ getPayload(event).currentSet }}
          </p>

          <p v-if="getPayload(event).finalScore">
            <strong>Фінальний рахунок:</strong>
            {{ getPayload(event).finalScore.team1 }} : {{ getPayload(event).finalScore.team2 }}
          </p>

          <p v-if="getPayload(event).fouls">
            <strong>Фоли:</strong>
            {{ getPayload(event).fouls.team1 }} : {{ getPayload(event).fouls.team2 }}
          </p>

          <details>
            <summary>Технічні дані</summary>
            <pre>{{ JSON.stringify(getPayload(event), null, 2) }}</pre>
          </details>
        </div>
      </article>
    </div>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #0f1115;
  color: white;
  padding: 32px;
}

.back {
  color: #60a5fa;
}

h1 {
  margin: 24px 0;
  font-size: 48px;
}

.list {
  display: grid;
  gap: 18px;
}

.card {
  background: #111827;
  border: 1px solid #243041;
  border-radius: 18px;
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  border-bottom: 1px solid #243041;
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.card-header h2 {
  margin: 0;
  font-size: 24px;
}

.card-header span {
  color: #93c5fd;
}

.details {
  display: grid;
  gap: 8px;
}

pre {
  white-space: pre-wrap;
  color: #dbeafe;
  background: #0b1220;
  padding: 12px;
  border-radius: 12px;
}

summary {
  cursor: pointer;
  color: #60a5fa;
}

.error {
  color: #f87171;
}

.empty {
  color: #dbeafe;
  font-size: 22px;
}
</style>