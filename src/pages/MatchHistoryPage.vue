<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'

const route = useRoute()
const matchId = route.params.id

const loading = ref(true)
const error = ref('')
const events = ref<any[]>([])

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
    <RouterLink to="/dashboard">← Назад</RouterLink>

    <h1>Історія матчу #{{ matchId }}</h1>

    <div v-if="loading">Завантаження...</div>
    <div v-else-if="error" class="error">{{ error }}</div>

    <div v-else class="list">
      <article v-for="event in events" :key="event.id" class="card">
        <h3>{{ event.eventType }}</h3>
        <pre>{{ event.payloadJson ?? event.payload_json ?? event.payload }}</pre>
        <small>{{ event.createdAt ?? event.created_at }}</small>
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

.card {
  background: #111827;
  border: 1px solid #243041;
  border-radius: 16px;
  padding: 18px;
  margin-top: 16px;
}

pre {
  white-space: pre-wrap;
  color: #dbeafe;
}

.error {
  color: #f87171;
}
</style>