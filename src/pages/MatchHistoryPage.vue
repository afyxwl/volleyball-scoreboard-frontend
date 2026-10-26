<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import api from '../services/api'

type EventCategory =
  | 'score'
  | 'foul'
  | 'timeout'
  | 'period'
  | 'other'

interface MatchEvent {
  id: number
  eventType?: string
  event_type?: string
  payloadJson?: any
  payload_json?: any
  payload?: any
  createdAt?: string
  created_at?: string
}

interface MatchInfo {
  id?: number
  sportType?: string
  team1Name?: string
  team2Name?: string
  score1?: number
  score2?: number
  fouls1?: number
  fouls2?: number
  timeouts1?: number
  timeouts2?: number
  currentSet?: number
  periodTime?: string
  status?: string
  setScores?: {
    team1: number[]
    team2: number[]
  }
}

const route = useRoute()
const matchId = route.params.id

const loading = ref(true)
const error = ref('')
const events = ref<MatchEvent[]>([])
const match = ref<MatchInfo | null>(null)

const activeFilter = ref('all')

const filters = [
  { id: 'all', label: 'Усі події' },
  { id: 'score', label: 'Очки' },
  { id: 'foul', label: 'Фоли' },
  { id: 'timeout', label: 'Таймаути' },
  { id: 'period', label: 'Партії та періоди' },
]

function payloadOf(event: MatchEvent): Record<string, any> {
  const raw =
    event.payloadJson ??
    event.payload_json ??
    event.payload ??
    {}

  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }

  return raw && typeof raw === 'object' ? raw : {}
}

function typeOf(event: MatchEvent) {
  return event.eventType ?? event.event_type ?? ''
}

function teamName(team: number) {
  if (team === 1) {
    return match.value?.team1Name || 'Команда 1'
  }

  if (team === 2) {
    return match.value?.team2Name || 'Команда 2'
  }

  return 'Команда'
}

function categoryOf(event: MatchEvent): EventCategory {
  const type = typeOf(event)

  if (
    type.includes('score') ||
    type.includes('point')
  ) {
    return 'score'
  }

  if (type.includes('foul')) {
    return 'foul'
  }

  if (type.includes('timeout')) {
    return 'timeout'
  }

  if (
    type.includes('period') ||
    type.includes('set_finished') ||
    type === 'match.finished'
  ) {
    return 'period'
  }

  return 'other'
}

function eventTitle(event: MatchEvent) {
  const type = typeOf(event)
  const data = payloadOf(event)

  switch (type) {
    case 'match.created':
      return 'Матч створено'

    case 'match.point_added':
      return `${teamName(Number(data.team))} набрала очко`

    case 'match.point_removed':
      return `Скасовано очко команди ${teamName(Number(data.team))}`

    case 'match.score_updated': {
      const delta = Number(data.delta ?? 0)
      const name = teamName(Number(data.team))

      if (delta > 0) {
        return `${name}: додано ${delta} очк.`
      }

      if (delta < 0) {
        return `${name}: знято ${Math.abs(delta)} очк.`
      }

      return `Рахунок команди ${name} оновлено`
    }

    case 'match.fouls_updated': {
      const delta = Number(data.delta ?? 0)
      const name = teamName(Number(data.team))

      return delta > 0
        ? `${name} отримала фол`
        : delta < 0
          ? `Скасовано фол команди ${name}`
          : `Фоли команди ${name} оновлено`
    }

    case 'match.timeout_taken':
      return `${teamName(Number(data.team))} взяла таймаут`

    case 'match.timeout_updated': {
      const delta = Number(data.delta ?? 0)

      return delta > 0
        ? `${teamName(Number(data.team))} взяла таймаут`
        : delta < 0
          ? `Скасовано таймаут команди ${teamName(Number(data.team))}`
          : 'Кількість таймаутів змінено'
    }

    case 'match.period_started':
      return 'Гру розпочато або відновлено'

    case 'match.period_paused':
      return 'Гру поставлено на паузу'

    case 'match.period_finished':
      return 'Період завершено'

    case 'match.volleyball_set_finished':
      return `Завершено партію №${data.set ?? ''}`

    case 'match.finished':
      return 'Матч завершено'

    case 'match.clock_updated':
      return 'Час матчу змінено'

    case 'match.shot_clock_updated':
      return 'Годинник атаки оновлено'

    case 'match.teams_renamed':
      return 'Назви команд змінено'

    case 'match.settings_updated':
      return 'Налаштування матчу змінено'

    case 'match.reset':
    case 'match_reset':
      return 'Матч скинуто'

    default:
      return 'Інша подія матчу'
  }
}

function eventDescription(event: MatchEvent) {
  const type = typeOf(event)
  const data = payloadOf(event)

  if (type === 'match.volleyball_set_finished' && data.setScore) {
    const a = Number(data.setScore.team1)
    const b = Number(data.setScore.team2)

    const winner =
      a > b ? teamName(1) :
      b > a ? teamName(2) :
      'Нічия'

    return `Рахунок партії ${a}:${b}. Переможець: ${winner}`
  }

  if (type === 'match.finished') {
    return 'Гру завершено. Підсумковий результат наведено вище.'
  }

  if (type === 'match.period_paused') {
    return 'Ігровий таймер зупинено.'
  }

  if (type === 'match.period_started') {
    return 'Ігровий таймер запущено.'
  }

  if (type === 'match.clock_updated' && data.time) {
    return `Встановлено час ${data.time}`
  }

  if (data.comment) {
    return String(data.comment)
  }

  return ''
}

function eventTime(event: MatchEvent) {
  const value = event.createdAt ?? event.created_at

  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleTimeString('uk-UA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function eventDate(event: MatchEvent) {
  const value = event.createdAt ?? event.created_at

  if (!value) return ''

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleDateString('uk-UA')
}

function gameTime(event: MatchEvent) {
  const data = payloadOf(event)

  return data.periodTime || data.time || ''
}

const sortedEvents = computed(() => {
  return [...events.value].sort((a, b) => a.id - b.id)
})

const filteredEvents = computed(() => {
  if (activeFilter.value === 'all') {
    return sortedEvents.value
  }

  return sortedEvents.value.filter(
    (event) => categoryOf(event) === activeFilter.value
  )
})

const isVolleyball = computed(
  () => match.value?.sportType === 'volleyball'
)

const setResults = computed(() => {
  if (!isVolleyball.value) return []

  const scores = match.value?.setScores

  const results: {
    set: number
    team1: number
    team2: number
  }[] = []

  if (scores) {
    const count = Math.min(
      scores.team1?.length ?? 0,
      scores.team2?.length ?? 0
    )

    for (let i = 0; i < count; i++) {
      const a = Number(scores.team1[i])
      const b = Number(scores.team2[i])

      if (!Number.isFinite(a) || !Number.isFinite(b)) continue

      results.push({
        set: i + 1,
        team1: a,
        team2: b,
      })
    }
  }

  // П'ята партія у поточному бекенді
  // залишається у фінальних score1 / score2.
  if (
    (match.value?.currentSet ?? 0) >= 5 &&
    match.value?.status === 'finished'
  ) {
    results.push({
      set: 5,
      team1: Number(match.value?.score1 ?? 0),
      team2: Number(match.value?.score2 ?? 0),
    })
  }

  return results
})

const finalScore = computed(() => {
  if (!match.value) {
    return { team1: 0, team2: 0 }
  }

  if (!isVolleyball.value) {
    return {
      team1: Number(match.value.score1 ?? 0),
      team2: Number(match.value.score2 ?? 0),
    }
  }

  let team1 = 0
  let team2 = 0

  for (const set of setResults.value) {
    if (set.team1 > set.team2) team1++
    if (set.team2 > set.team1) team2++
  }

  return { team1, team2 }
})

const winner = computed(() => {
  if (finalScore.value.team1 > finalScore.value.team2) {
    return teamName(1)
  }

  if (finalScore.value.team2 > finalScore.value.team1) {
    return teamName(2)
  }

  return 'Нічия'
})

const finishedEvent = computed(() => {
  return [...sortedEvents.value]
    .reverse()
    .find((event: MatchEvent) => typeOf(event) === 'match.finished')
})

const matchStatus = computed(() => {
  return match.value?.status === 'finished'
    ? 'Матч завершено'
    : 'Матч триває'
})

async function loadHistory() {
  try {
    loading.value = true
    error.value = ''

    const [eventsResponse, matchResponse] = await Promise.all([
      api.get(`/matches/${matchId}/history`),
      api.get(`/matches/${matchId}`),
    ])

    const eventsData =
      eventsResponse.data?.data ?? eventsResponse.data

    const matchData =
      matchResponse.data?.data ?? matchResponse.data

    events.value = Array.isArray(eventsData)
      ? eventsData
      : []

    match.value = matchData ?? null
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
    <RouterLink to="/screens" class="back">
      ← Назад до екранів
    </RouterLink>

    <header class="header">
      <div>
        <span class="eyebrow">ДЕТАЛЬНА ІСТОРІЯ</span>
        <h1>Матч №{{ matchId }}</h1>
        <p>Хронологія гри та підсумкова статистика</p>
      </div>

      <button type="button" class="refresh" @click="loadHistory">
        Оновити дані
      </button>
    </header>

    <p v-if="loading" class="message">
      Завантаження...
    </p>

    <p v-else-if="error" class="message error">
      {{ error }}
    </p>

    <template v-else>
      <!-- Фінальне табло -->

      <section v-if="match" class="final-board">
        <div class="board-status">
          {{ matchStatus }}
        </div>

        <div class="board-content">
          <div class="board-team first">
            <span>КОМАНДА 1</span>
            <h2>{{ teamName(1) }}</h2>
          </div>

          <div class="board-score">
            <strong>
              {{ finalScore.team1 }}
              <span>:</span>
              {{ finalScore.team2 }}
            </strong>

            <small>
              {{ isVolleyball ? 'ПАРТІЇ' : 'ОЧКИ' }}
            </small>
          </div>

          <div class="board-team second">
            <span>КОМАНДА 2</span>
            <h2>{{ teamName(2) }}</h2>
          </div>
        </div>

        <div class="board-winner">
          Переможець:
          <strong>{{ winner }}</strong>
        </div>

        <div v-if="finishedEvent" class="board-date">
          Завершено:
          {{ eventDate(finishedEvent) }}
          о {{ eventTime(finishedEvent) }}
        </div>
      </section>

      <!-- Статистика -->

      <section v-if="match" class="statistics">
        <h2>Статистика матчу</h2>

        <div class="stats-grid">
          <div class="stat">
            <span>Вид спорту</span>
            <strong>
              {{ isVolleyball ? 'Волейбол' : 'Баскетбол' }}
            </strong>
          </div>

          <div class="stat">
            <span>Фоли</span>
            <strong>
              {{ match.fouls1 ?? 0 }}
              :
              {{ match.fouls2 ?? 0 }}
            </strong>
          </div>

          <div class="stat">
            <span>Таймаути</span>
            <strong>
              {{ match.timeouts1 ?? 0 }}
              :
              {{ match.timeouts2 ?? 0 }}
            </strong>
          </div>

          <div class="stat">
            <span>
              {{ isVolleyball ? 'Остання партія' : 'Період' }}
            </span>

            <strong>{{ match.currentSet ?? '—' }}</strong>
          </div>
        </div>
      </section>

      <!-- Партії -->

      <section
        v-if="isVolleyball && setResults.length"
        class="sets-section"
      >
        <h2>Результати партій</h2>

        <div class="sets-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Партія</th>
                <th>{{ teamName(1) }}</th>
                <th>{{ teamName(2) }}</th>
                <th>Переможець</th>
              </tr>
            </thead>

            <tbody>
              <tr v-for="set in setResults" :key="set.set">
                <td>№{{ set.set }}</td>
                <td>{{ set.team1 }}</td>
                <td>{{ set.team2 }}</td>

                <td class="set-winner">
                  {{
                    set.team1 > set.team2
                      ? teamName(1)
                      : set.team2 > set.team1
                        ? teamName(2)
                        : 'Нічия'
                  }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Хронологія -->

      <section class="timeline-section">
        <div class="timeline-header">
          <div>
            <span class="eyebrow">ПЕРЕБІГ ГРИ</span>
            <h2>Хронологія подій</h2>
          </div>

          <span class="events-count">
            Усього подій: {{ events.length }}
          </span>
        </div>

        <div class="filters">
          <button
            v-for="filter in filters"
            :key="filter.id"
            type="button"
            :class="{ active: activeFilter === filter.id }"
            @click="activeFilter = filter.id"
          >
            {{ filter.label }}
          </button>
        </div>

        <p v-if="filteredEvents.length === 0" class="message">
          Подій у цій категорії немає.
        </p>

        <div v-else class="timeline">
          <article
            v-for="event in filteredEvents"
            :key="event.id"
            class="event"
            :class="categoryOf(event)"
          >
            <div class="event-marker"></div>

            <div class="event-card">
              <div class="event-top">
                <div class="event-time">
                  {{ eventTime(event) }}
                </div>

                <span
                  v-if="gameTime(event)"
                  class="game-time"
                >
                  Час гри: {{ gameTime(event) }}
                </span>
              </div>

              <h3>{{ eventTitle(event) }}</h3>

              <p v-if="eventDescription(event)">
                {{ eventDescription(event) }}
              </p>

              <span class="event-date">
                {{ eventDate(event) }}
              </span>
            </div>
          </article>
        </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #090e18;
  color: #f8fafc;
  padding: 36px;
}

.back {
  color: #93c5fd;
  text-decoration: none;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin: 28px 0 32px;
  flex-wrap: wrap;
}

.eyebrow {
  color: #60a5fa;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 2px;
}

h1 {
  font-size: clamp(30px, 4vw, 46px);
  margin: 8px 0;
}

.header p {
  color: #94a3b8;
}

.refresh {
  background: #1d4ed8;
  color: white;
  border: none;
  border-radius: 12px;
  padding: 13px 20px;
  cursor: pointer;
  font-weight: 700;
}

.final-board {
  background: #070d1b;
  border: 1px solid #334155;
  border-radius: 24px;
  padding: 30px;
  margin-bottom: 30px;
  text-align: center;
}

.board-status {
  color: #6ee7b7;
  font-size: 15px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.board-content {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 20px;
  margin: 30px 0;
}

.board-team {
  min-width: 0;
}

.board-team span {
  color: #94a3b8;
  font-size: 12px;
  letter-spacing: 2px;
}

.board-team h2 {
  font-size: clamp(22px, 3vw, 42px);
  margin: 14px 0;
  overflow-wrap: anywhere;
}

.first h2 {
  color: #f43f5e;
}

.second h2 {
  color: #3b82f6;
}

.board-score strong {
  font-size: clamp(48px, 7vw, 100px);
  font-weight: 900;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.board-score strong span {
  color: #64748b;
}

.board-score small {
  display: block;
  color: #94a3b8;
  letter-spacing: 2px;
}

.board-winner {
  font-size: 20px;
  color: #94a3b8;
}

.board-winner strong {
  color: #6ee7b7;
}

.board-date {
  margin-top: 12px;
  color: #64748b;
  font-size: 14px;
}

.statistics,
.sets-section,
.timeline-section {
  background: #101827;
  border: 1px solid #263449;
  border-radius: 20px;
  padding: 26px;
  margin-bottom: 24px;
}

.statistics h2,
.sets-section h2,
.timeline-section h2 {
  margin: 0 0 22px;
  font-size: 26px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.stat {
  background: #172235;
  border-radius: 14px;
  padding: 20px;
  text-align: center;
}

.stat span {
  display: block;
  color: #94a3b8;
  font-size: 13px;
  margin-bottom: 12px;
}

.stat strong {
  font-size: 24px;
}

.sets-table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

th,
td {
  padding: 16px;
  border-bottom: 1px solid #263449;
}

th {
  color: #94a3b8;
  font-size: 13px;
}

.set-winner {
  color: #6ee7b7;
  font-weight: 700;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.events-count {
  color: #94a3b8;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 20px 0 30px;
}

.filters button {
  border: 1px solid #334155;
  background: #172235;
  color: #cbd5e1;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
}

.filters button.active {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
}

.timeline {
  position: relative;
  padding-left: 34px;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 10px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #334155;
}

.event {
  position: relative;
  margin-bottom: 16px;
}

.event-marker {
  position: absolute;
  left: -30px;
  top: 24px;
  width: 14px;
  height: 14px;
  background: #64748b;
  border-radius: 50%;
  border: 3px solid #101827;
}

.event.score .event-marker {
  background: #22c55e;
}

.event.foul .event-marker {
  background: #ef4444;
}

.event.timeout .event-marker {
  background: #f59e0b;
}

.event.period .event-marker {
  background: #3b82f6;
}

.event-card {
  background: #172235;
  border: 1px solid #263449;
  border-radius: 14px;
  padding: 20px;
}

.event-top {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.event-time {
  font-size: 18px;
  font-weight: 800;
  color: #e2e8f0;
}

.game-time {
  color: #93c5fd;
  font-size: 13px;
}

.event-card h3 {
  font-size: 19px;
  margin: 0 0 8px;
}

.event-card p {
  color: #cbd5e1;
  margin: 0 0 10px;
}

.event-date {
  font-size: 12px;
  color: #64748b;
}

.message {
  padding: 22px;
  background: #172235;
  border-radius: 12px;
  color: #cbd5e1;
}

.error {
  color: #f87171;
}

@media (max-width: 800px) {
  .page {
    padding: 18px;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .board-content {
    gap: 8px;
  }

  .final-board,
  .statistics,
  .sets-section,
  .timeline-section {
    padding: 18px;
  }
}

@media (max-width: 480px) {
  .board-content {
    grid-template-columns: 1fr;
  }

  .board-score {
    order: -1;
  }

  .board-team h2 {
    margin: 8px 0;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>