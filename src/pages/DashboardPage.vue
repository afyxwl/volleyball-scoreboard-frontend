<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

type Screen = {
  id: number
  name: string
  slug: string
  isActive: boolean
}

const auth = useAuthStore()
const tvBaseUrl = import.meta.env.VITE_TV_URL

const screens = ref<Screen[]>([])
const loading = ref(true)
const error = ref('')

async function loadScreens() {
  try {
    loading.value = true
    error.value = ''
    const { data } = await api.get('/screens')
    screens.value = data
  } catch (err) {
    error.value = 'Не вдалося завантажити екрани'
    console.error(err)
  } finally {
    loading.value = false
  }
}

function logout() {
  auth.logout()
  window.location.href = '/login'
}

onMounted(loadScreens)
</script>

<template>
  <div class="page">
    <div class="topbar">
      <h1>Dashboard</h1>
      <button class="logout-btn" @click="logout">Logout</button>
    </div>

    <p v-if="loading">Завантаження...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <div v-else class="screens-grid">
      <div v-for="screen in screens" :key="screen.id" class="card">
        <h2>{{ screen.name }}</h2>
        <p>Slug: {{ screen.slug || '—' }}</p>
        <p>Активний: {{ screen.isActive ? 'Так' : 'Ні' }}</p>

        <div class="actions">
          <RouterLink :to="`/screens/${screen.id}/control`">Керування</RouterLink>

          <a
            :href="`${tvBaseUrl}/screens/${screen.id}`"
            target="_blank"
            rel="noopener"
          >
            Open TV
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.logout-btn {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
}

.screens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
}

.card {
  background: #161b22;
  border: 1px solid #2b313c;
  border-radius: 16px;
  padding: 20px;
}

.actions {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.actions a {
  text-decoration: none;
  background: #2563eb;
  color: white;
  padding: 10px 12px;
  border-radius: 10px;
}

.error-text {
  color: #f87171;
}
</style>