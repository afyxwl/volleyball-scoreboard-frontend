<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'

interface SetScores {
  team1: number[]
  team2: number[]
}

interface Match {
  id: number
  sportType: string
  team1Name: string
  team2Name: string
  score1: number
  score2: number
  currentSet: number
  periodTime: string
  fouls1: number
  fouls2: number
  timeouts1: number
  timeouts2: number
  finishedAt: string
  setScores?: SetScores
}

const route = useRoute()
const screenId = route.params.id

const loading = ref(true)
const error = ref('')
const matches = ref<Match[]>([])
const search = ref('')
const sportFilter = ref('all')

const filteredMatches = computed(() => {
  return matches.value.filter((match) => {
    const names = `${match.team1Name} ${match.team2Name}`.toLowerCase()

    const matchesSearch = names.includes(search.value.toLowerCase())

    const matchesSport =
      sportFilter.value === 'all' ||
      match.sportType === sportFilter.value

    return matchesSearch && matchesSport
  })
})

function sportName(type: string) {
  return type === 'volleyball' ? 'Волейбол' : 'Баскетбол'
}

function formatDate(value: string) {
  if (!value) return 'Дата невідома'

  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? 'Дата невідома'
    : date.toLocaleString('uk-UA')
}

function getSetWins(match: Match) {
  const scores = match.setScores

  let team1 = 0
  let team2 = 0

  if (scores) {
    const count = Math.min(
      scores.team1?.length ?? 0,
      scores.team2?.length ?? 0
    )

    for (let i = 0; i < count; i++) {
      const a = Number(scores.team1[i])
      const b = Number(scores.team2[i])

      if (!Number.isFinite(a) || !Number.isFinite(b)) continue

      if (a > b) team1++
      if (b > a) team2++
    }
  }

  // У поточній реалізації бекенду фінальна п'ята
  // партія залишається у score1 / score2.
  if (match.currentSet >= 5) {
    if (match.score1 > match.score2) team1++
    if (match.score2 > match.score1) team2++
  }

  return { team1, team2 }
}

function displayScore(match: Match) {
  if (match.sportType === 'volleyball') {
    const wins = getSetWins(match)
    return `${wins.team1} : ${wins.team2}`
  }

  return `${match.score1} : ${match.score2}`
}

function winner(match: Match) {
  const score =
    match.sportType === 'volleyball'
      ? getSetWins(match)
      : { team1: match.score1, team2: match.score2 }

  if (score.team1 > score.team2) return match.team1Name
  if (score.team2 > score.team1) return match.team2Name

  return 'Нічия'
}

async function loadHistory() {
  try {
    loading.value = true
    error.value = ''

    const response = await api.get(
      `/screens/${screenId}/matches/history`
    )

    const data = response.data?.data ?? response.data

    matches.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити історію матчів'
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <main class="history-page">
    <RouterLink
      :to="`/screens/${screenId}/control`"
      class="back-link"
    >
      ← Назад до керування
    </RouterLink>

    <header class="page-header">
      <div>
        <span class="eyebrow">АРХІВ ТУРНІРУ</span>
        <h1>Історія матчів</h1>
        <p>Результати завершених ігор та їхня хронологія</p>
      </div>

      <div class="total-badge">
        Завершено матчів: {{ matches.length }}
      </div>
    </header>

    <section class="filters">
      <input
        v-model="search"
        type="search"
        placeholder="Пошук за назвою команди..."
      />

      <select v-model="sportFilter">
        <option value="all">Усі види спорту</option>
        <option value="volleyball">Волейбол</option>
        <option value="basketball">Баскетбол</option>
      </select>

      <button type="button" @click="loadHistory">
        Оновити
      </button>
    </section>

    <p v-if="loading" class="message">
      Завантаження історії...
    </p>

    <p v-else-if="error" class="message error">
      {{ error }}
    </p>

    <p v-else-if="filteredMatches.length === 0" class="message">
      Матчів за вибраними параметрами не знайдено.
    </p>

    <section v-else class="matches-grid">
      <article
        v-for="match in filteredMatches"
        :key="match.id"
        class="match-card"
      >
        <div class="card-top">
          <span class="sport-badge">
            {{ sportName(match.sportType) }}
          </span>

          <span class="finished-badge">
            Завершено
          </span>
        </div>

        <div class="match-date">
          {{ formatDate(match.finishedAt) }}
        </div>

        <div class="scoreboard">
          <div class="team">
            <span class="team-label">КОМАНДА 1</span>
            <strong>{{ match.team1Name }}</strong>
          </div>

          <div class="score">
            {{ displayScore(match) }}
          </div>

          <div class="team">
            <span class="team-label">КОМАНДА 2</span>
            <strong>{{ match.team2Name }}</strong>
          </div>
        </div>

        <div class="winner">
          Переможець: <strong>{{ winner(match) }}</strong>
        </div>

        <div class="match-meta">
          <span>
            {{ match.sportType === 'volleyball'
              ? 'Остання партія'
              : 'Останній період' }}:
            {{ match.currentSet }}
          </span>

          <span>Час: {{ match.periodTime }}</span>
        </div>

        <RouterLink
          :to="`/matches/${match.id}/history`"
          class="details-button"
        >
          Переглянути історію матчу →
        </RouterLink>
      </article>
    </section>
  </main>
</template>

<style scoped>
.history-page {
  min-height: 100vh;
  padding: 36px;
  background: #090e18;
  color: #f8fafc;
}

.back-link {
  color: #93c5fd;
  text-decoration: none;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  margin: 28px 0;
  flex-wrap: wrap;
}

.eyebrow {
  color: #60a5fa;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
}

h1 {
  font-size: clamp(30px, 4vw, 48px);
  margin: 8px 0;
}

.page-header p {
  color: #94a3b8;
}

.total-badge,
.sport-badge,
.finished-badge {
  padding: 9px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
}

.total-badge {
  background: #172338;
  color: #bfdbfe;
}

.sport-badge {
  background: #172554;
  color: #93c5fd;
}

.finished-badge {
  background: #064e3b;
  color: #6ee7b7;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 28px;
  flex-wrap: wrap;
}

.filters input,
.filters select,
.filters button {
  background: #111b2c;
  color: white;
  border: 1px solid #334155;
  border-radius: 12px;
  padding: 13px 16px;
  font-size: 15px;
}

.filters input {
  flex: 1;
  min-width: 220px;
}

.filters button {
  cursor: pointer;
  background: #2563eb;
  border-color: #2563eb;
}

.matches-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 350px), 1fr));
  gap: 20px;
}

.match-card {
  background: #101827;
  border: 1px solid #263449;
  border-radius: 20px;
  padding: 24px;
}

.card-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.match-date {
  margin-top: 16px;
  color: #94a3b8;
  font-size: 14px;
}

.scoreboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin: 30px 0 20px;
}

.team {
  min-width: 0;
  text-align: center;
}

.team-label {
  display: block;
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 10px;
}

.team strong {
  display: block;
  font-size: clamp(16px, 2vw, 24px);
  overflow-wrap: anywhere;
}

.score {
  font-size: clamp(30px, 3vw, 46px);
  font-weight: 900;
  white-space: nowrap;
  color: #f8fafc;
}

.winner {
  text-align: center;
  color: #94a3b8;
  margin-bottom: 22px;
}

.winner strong {
  color: #6ee7b7;
}

.match-meta {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  color: #94a3b8;
  border-top: 1px solid #263449;
  padding-top: 18px;
  font-size: 14px;
}

.details-button {
  display: block;
  margin-top: 24px;
  padding: 15px;
  text-align: center;
  text-decoration: none;
  border-radius: 12px;
  background: #2563eb;
  color: white;
  font-weight: 700;
}

.details-button:hover {
  background: #1d4ed8;
}

.message {
  padding: 30px;
  background: #101827;
  border-radius: 16px;
  color: #cbd5e1;
}

.error {
  color: #f87171;
}

@media (max-width: 600px) {
  .history-page {
    padding: 18px;
  }

  .match-card {
    padding: 18px;
  }
}
</style>