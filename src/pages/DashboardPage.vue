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

type FinishedMatch = {
  id: number
  screenId: number
  team1Name: string
  team2Name: string
  score1: number
  score2: number
  fouls1: number
  fouls2: number
  timeouts1: number
  timeouts2: number
  currentSet: number
  periodTime: string
  finishedAt: string
}

const auth = useAuthStore()
const tvBaseUrl = import.meta.env.VITE_TV_URL || 'http://localhost:5174'

const screens = ref<Screen[]>([])
const users = ref<User[]>([])
const finishedMatches = ref<FinishedMatch[]>([])

const loading = ref(true)
const error = ref('')

const activeScreensCount = computed(() => screens.value.filter((s) => s.isActive).length)

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    const [screensRes, usersRes] = await Promise.all([
      api.get('/screens'),
      api.get('/users'),
    ])

    const screensPayload = screensRes.data?.data ?? screensRes.data
    const usersPayload = usersRes.data?.data ?? usersRes.data

    screens.value = Array.isArray(screensPayload) ? screensPayload : []
    users.value = Array.isArray(usersPayload) ? usersPayload : []

    try {
      const historyRes = await api.get('/matches/history')
      const historyPayload = historyRes.data?.data ?? historyRes.data
      finishedMatches.value = Array.isArray(historyPayload) ? historyPayload : []
    } catch (historyError) {
      console.error('Не вдалося завантажити історію матчів', historyError)
      finishedMatches.value = []
    }
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити панель керування'
  } finally {
    loading.value = false
  }
}

function formatDate(value: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString('uk-UA')
}

function logout() {
  auth.logout()
  window.location.href = '/login'
}

onMounted(loadDashboard)
</script>

<template>
  <main class="page">
    <header class="topbar">
      <div>
        <h1>Панель керування</h1>
        <p class="subtitle">Панель керування спортивним табло</p>
      </div>

      <div class="topbar-actions">
        <span class="user-email">{{ auth.user?.email }}</span>
        <button class="danger" @click="logout">Вийти</button>
      </div>
    </header>

    <p v-if="loading" class="loading">Завантаження...</p>
    <p v-else-if="error" class="error-text">{{ error }}</p>

    <template v-else>
      <section class="stats-grid">
        <article class="card stat-card">
          <h3>Користувачі</h3>
          <p class="stat-value">{{ users.length }}</p>
          <RouterLink to="/users" class="btn">Редагувати користувачів</RouterLink>
        </article>

        <article class="card stat-card">
          <h3>Екрани</h3>
          <p class="stat-value">{{ screens.length }}</p>
          <RouterLink to="/screens" class="btn">Редагувати екрани</RouterLink>
        </article>

        <article class="card stat-card">
          <h3>Активні екрани</h3>
          <p class="stat-value">{{ activeScreensCount }}</p>
          <RouterLink to="/screens" class="btn">Відкрити список</RouterLink>
          <RouterLink to="/admin" class="btn">Панель суперадміна</RouterLink>
        </article>
      </section>

      <section class="section card">
        <div class="section-header">
          <h2>Екрани</h2>
          <RouterLink to="/screens" class="btn">Всі екрани</RouterLink>
        </div>

        <p v-if="screens.length === 0" class="empty-text">
          Екранів поки немає. Створи перший екран у розділі “Екрани”.
        </p>

        <div v-else class="screens-grid">
          <article v-for="screen in screens" :key="screen.id" class="screen-card">
            <h3>{{ screen.name || 'Екран ' + screen.id }}</h3>
            <p>ID: {{ screen.id }}</p>
            <p>Slug: {{ screen.slug ?? '—' }}</p>
            <p>Активний: {{ screen.isActive ? 'Так' : 'Ні' }}</p>

            <div class="actions">
              <RouterLink :to="`/screens/${screen.id}/control`" class="btn">
                Налаштування табло
              </RouterLink>

              <a
                :href="`${tvBaseUrl}/screens/${screen.id}`"
                target="_blank"
                rel="noopener"
                class="btn"
              >
                Відкрити TV
              </a>
            </div>
          </article>
        </div>
      </section>

      <section class="card history-card">
        <h2>Історія завершених матчів</h2>

        <div v-if="finishedMatches.length === 0" class="empty">
          Завершених матчів поки немає
        </div>

        <div v-else class="matches-history">
          <article v-for="match in finishedMatches" :key="match.id" class="match-card">
            <div class="match-header">
              <strong>Матч #{{ match.id }}</strong>
              <span>Екран #{{ match.screenId }}</span>
            </div>

            <div class="teams-result">
              <div>
                <span>{{ match.team1Name }}</span>
                <strong>{{ match.score1 }}</strong>
              </div>

              <span class="separator">:</span>

              <div>
                <strong>{{ match.score2 }}</strong>
                <span>{{ match.team2Name }}</span>
              </div>
            </div>

            <div class="match-info">
              <p>Сет: {{ match.currentSet }}</p>
              <p>Час: {{ match.periodTime }}</p>
              <p>Фоли: {{ match.fouls1 }} : {{ match.fouls2 }}</p>
              <p>Таймаути: {{ match.timeouts1 }} : {{ match.timeouts2 }}</p>
              <p>Завершено: {{ formatDate(match.finishedAt) }}</p>
            </div>

            <RouterLink :to="`/matches/${match.id}/history`" class="btn">
              Детальна хронологія
            </RouterLink>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  padding: 32px;
}

.topbar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

h1 {
  margin: 0;
  font-size: clamp(38px, 5vw, 64px);
  line-height: 1;
}

.subtitle {
  opacity: 0.75;
  margin-top: 10px;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.user-email {
  color: #94a3b8;
}

.loading {
  text-align: center;
  margin-top: 60px;
  font-weight: 800;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(220px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

.stat-card {
  display: grid;
  gap: 12px;
}

.stat-value {
  font-size: 46px;
  font-weight: 1000;
  margin: 0;
  color: #22d3ee;
}

.section {
  margin-bottom: 28px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.screens-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}

.screen-card,
.match-card {
  background: #05070d;
  border: 2px solid rgba(34, 211, 238, 0.25);
  border-radius: 18px;
  padding: 18px;
}

.actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.history-card {
  margin-top: 28px;
}

.matches-history {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 18px;
}

.match-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: #93c5fd;
  margin-bottom: 14px;
}

.teams-result {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  font-size: 22px;
  margin-bottom: 14px;
}

.teams-result div {
  display: grid;
  gap: 4px;
  text-align: center;
}

.teams-result strong {
  font-size: 52px;
  color: #22d3ee;
}

.separator {
  font-size: 32px;
  color: #94a3b8;
}

.match-info {
  color: #e2e8f0;
  margin-bottom: 14px;
}

.error-text {
  color: #fb7185;
  font-weight: 900;
}

.empty,
.empty-text {
  color: #94a3b8;
  font-size: 18px;
}

@media (max-width: 900px) {
  .page {
    padding: 18px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .topbar-actions {
    width: 100%;
  }

  .actions {
    display: grid;
  }
}
</style>