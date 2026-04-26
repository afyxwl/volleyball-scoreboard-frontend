<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'
import { useAuthStore } from '../stores/auth'

type Screen = {
  id: number
  name?: string
  slug?: string
  isActive?: boolean
}

type User = {
  id: number
  email: string
  fullName?: string | null
  role?: string
}

const auth = useAuthStore()
const tvBaseUrl = import.meta.env.VITE_TV_URL

const screens = ref<Screen[]>([])
const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')

const activeScreensCount = computed(() => screens.value.filter((s) => s.isActive).length)

async function loadDashboard() {
  try {
    loading.value = true
    error.value = ''

    const [screensRes, usersRes] = await Promise.all([
      api.get('/screens'),
      api.get('/users'),
    ])

    const screensPayload = screensRes.data?.data ?? screensRes.data
    const usersPayload = usersRes.data?.data ?? usersRes.data

    screens.value = Array.isArray(screensPayload) ? screensPayload : []
    users.value = Array.isArray(usersPayload) ? usersPayload : []
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити dashboard'
  } finally {
    loading.value = false
  }
}

function logout() {
  auth.logout()
  window.location.href = '/login'
}

onMounted(loadDashboard)
</script>

<template>
  <div class="page">
    <div class="topbar">
      <div>
        <h1>Панель керування</h1>
        <p class="subtitle">Панель керування спортивним табло</p>
      </div>

      <div class="topbar-actions">
        <span class="user-email">{{ auth.user?.email }}</span>
        <button class="logout-btn" @click="logout">Вийти</button>
      </div>
    </div>

    <p v-if="loading">Завантаження...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <template v-else>
      <div class="stats-grid">
        <div class="stat-card">
          <h3>Users</h3>
          <p class="stat-value">{{ users.length }}</p>
          <RouterLink to="/users">Редагувати користувачів</RouterLink>
        </div>

        <div class="stat-card">
          <h3>Screens</h3>
          <p class="stat-value">{{ screens.length }}</p>
          <RouterLink to="/screens">Редагувати екрани</RouterLink>
        </div>

        <div class="stat-card">
          <h3>Active screens</h3>
          <p class="stat-value">{{ activeScreensCount }}</p>
          <RouterLink to="/screens">Відкрити список</RouterLink>
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h2>Recent screens</h2>
          <RouterLink to="/screens" class="action-link">Всі екрани</RouterLink>
        </div>

        <p v-if="screens.length === 0" class="empty-text">
          Екранів поки немає. Створи перший екран у розділі Screens.
        </p>

        <div v-else class="screens-grid">
          <div v-for="screen in screens" :key="screen.id" class="screen-card">
            <h3>{{ screen.name || `Screen ${screen.id}` }}</h3>
            <p>ID: {{ screen.id }}</p>
            <p>Slug: {{ screen.slug || '—' }}</p>
            <p>Активний: {{ screen.isActive ? 'Так' : 'Ні' }}</p>

            <div class="actions">
              <RouterLink :to="`/screens/${screen.id}/control`">Налаштування табло</RouterLink>

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
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}
.topbar {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.subtitle {
  opacity: 0.75;
  margin-top: 4px;
}
.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.user-email {
  opacity: 0.8;
}
.logout-btn {
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
}
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}
.stat-card,
.screen-card {
  background: #161b22;
  border: 1px solid #2b313c;
  border-radius: 16px;
  padding: 20px;
}
.stat-value {
  font-size: 40px;
  font-weight: 800;
  margin: 8px 0 16px;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.screens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}
.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.actions a {
  text-decoration: none;
  background: #2563eb;
  color: #fff;
  padding: 10px 12px;
  border-radius: 10px;
}
.action-link {
  text-decoration: none;
}
.error-text {
  color: #f87171;
}
.empty-text {
  opacity: 0.8;
}
</style>