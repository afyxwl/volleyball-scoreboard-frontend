<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const screenId = route.params.id

const loading = ref(true)
const error = ref('')
const matches = ref<any[]>([])

async function loadHistory() {
  try {
    loading.value = true
    const response = await api.get(`/screens/${screenId}/matches/history`)
    matches.value = response.data?.data ?? response.data ?? []
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити історію матчів'
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  if (!value) return ''
  return new Date(value).toLocaleString('uk-UA')
}

onMounted(loadHistory)
</script>

<template>
  <main class="page">
    <RouterLink :to="`/screens/${screenId}/control`">← Назад до керування</RouterLink>

    <h1>Історія матчів екрана #{{ screenId }}</h1>

    <p v-if="loading">Завантаження...</p>
    <p v-else-if="error" class="error">{{ error }}</p>

    <div v-else-if="matches.length === 0" class="empty">
      Завершених матчів поки немає
    </div>

    <div v-else class="grid">
      <article v-for="match in matches" :key="match.id" class="card">
        <h2>{{ match.team1Name }} — {{ match.team2Name }}</h2>

        <div class="score">
          {{ match.score1 }} : {{ match.score2 }}
        </div>

        <p>Сет: {{ match.currentSet }}</p>
        <p>Час: {{ match.periodTime }}</p>
        <p>Фоли: {{ match.fouls1 }} : {{ match.fouls2 }}</p>
        <p>Таймаути: {{ match.timeouts1 }} : {{ match.timeouts2 }}</p>
        <p>Дата: {{ formatDate(match.finishedAt) }}</p>

        <RouterLink :to="`/matches/${match.id}/history`">
          Детальна хронологія
        </RouterLink>
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

a {
  color: #60a5fa;
}

h1 {
  margin: 24px 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 20px;
}

.card {
  background: #111827;
  border: 1px solid #243041;
  border-radius: 18px;
  padding: 20px;
}

.score {
  font-size: 56px;
  font-weight: 900;
  margin: 16px 0;
  color: #93c5fd;
}

.error {
  color: #f87171;
}

.empty {
  color: #dbeafe;
  font-size: 22px;
}
</style>