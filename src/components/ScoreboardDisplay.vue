<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    scoreboard: any
    displayedClock?: string
    displayedShotClock?: string
    preview?: boolean
  }>(),
  {
    displayedClock: '00:00',
    displayedShotClock: '24',
    preview: false,
  }
)

const sportType = computed(() => props.scoreboard?.sportType ?? 'volleyball')
const theme = computed(() => props.scoreboard?.theme ?? {})

const setScores = computed(() => ({
  team1: Array.isArray(props.scoreboard?.setScores?.team1)
    ? props.scoreboard.setScores.team1
    : [],
  team2: Array.isArray(props.scoreboard?.setScores?.team2)
    ? props.scoreboard.setScores.team2
    : [],
}))

const fontMap: Record<string, string> = {
  system: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Courier New', Consolas, monospace",
  display: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
}

const themeVars = computed(() => ({
  '--team1-color': theme.value.team1Color ?? '#67e8f9',
  '--team2-color': theme.value.team2Color ?? '#fda4af',
  '--board-font': fontMap[theme.value.fontFamily ?? 'system'] ?? fontMap.system,
}))

function mapStatus(status: string) {
  if (status === 'live') return 'Триває'
  if (status === 'paused') return 'Пауза'
  if (status === 'finished') return 'Завершено'
  return 'Чернетка'
}

function setScore(team: 1 | 2, index: number) {
  const list = team === 1 ? setScores.value.team1 : setScores.value.team2
  return list[index] ?? '—'
}

function setWins(team: 1 | 2) {
  const own = team === 1 ? setScores.value.team1 : setScores.value.team2
  const other = team === 1 ? setScores.value.team2 : setScores.value.team1

  return own.reduce((total: number, value: number, index: number) => {
    const opponent = other[index]

    if (typeof value === 'number' && typeof opponent === 'number' && value !== opponent) {
      return total + (value > opponent ? 1 : 0)
    }

    return total
  }, 0)
}
</script>
<template>
  <div
    class="screen-display"
    :class="[
      preview ? 'is-preview' : '',
      sportType === 'basketball' ? 'basketball-mode' : 'volleyball-mode',
    ]"
    :style="themeVars"
  >
    <div v-if="sportType === 'basketball'" class="basketball-board">
      <section class="team-card left-team">
        <div class="team-label">ГОСПОДАРІ</div>
        <div class="team-name">{{ scoreboard.team1.name }}</div>
        <div class="team-score">{{ scoreboard.team1.score }}</div>

        <div class="team-meta">
          <span>Таймаути: {{ scoreboard.team1.timeoutsUsed }}</span>
          <span>Фоли: {{ scoreboard.team1.fouls }}</span>
        </div>
      </section>

      <section class="center-card basketball-center">
        <div class="period">ПЕРІОД {{ scoreboard.currentSet }}</div>
        <div class="clock">{{ displayedClock }}</div>

        <div class="shot-clock-box">
          <span>АТАКА</span>
          <strong>{{ displayedShotClock }}</strong>
        </div>

        <div class="status">{{ mapStatus(scoreboard.status) }}</div>
      </section>

      <section class="team-card right-team">
        <div class="team-label">ГОСТІ</div>
        <div class="team-name">{{ scoreboard.team2.name }}</div>
        <div class="team-score">{{ scoreboard.team2.score }}</div>

        <div class="team-meta">
          <span>Таймаути: {{ scoreboard.team2.timeoutsUsed }}</span>
          <span>Фоли: {{ scoreboard.team2.fouls }}</span>
        </div>
      </section>
    </div>

    <div v-else class="volleyball-board">
      <section class="volley-team left-team">
        <div class="team-label">КОМАНДА 1</div>
        <div class="team-name">{{ scoreboard.team1.name }}</div>

        <div class="match-score-title">РАХУНОК МАТЧУ</div>
        <div class="match-score">{{ setWins(1) }}</div>

        <div class="set-history">
          <div v-for="index in 4" :key="`t1-${index}`" class="set-cell">
            <span>Партія {{ index }}</span>
            <strong>{{ setScore(1, index - 1) }}</strong>
          </div>
        </div>

        <div class="volley-meta">Таймаути: {{ scoreboard.team1.timeoutsUsed }}</div>
      </section>

      <section class="center-card current-set-card">
        <div class="period">СЕТ {{ scoreboard.currentSet }}</div>

        <div class="current-score">
          <span class="current-score-left">{{ scoreboard.team1.score }}</span>
          <span class="score-divider">:</span>
          <span class="current-score-right">{{ scoreboard.team2.score }}</span>
        </div>

        <div class="clock">{{ displayedClock }}</div>
        <div class="match-summary">Матч {{ setWins(1) }} : {{ setWins(2) }}</div>
        <div class="status">{{ mapStatus(scoreboard.status) }}</div>
      </section>

      <section class="volley-team right-team">
        <div class="team-label">КОМАНДА 2</div>
        <div class="team-name">{{ scoreboard.team2.name }}</div>

        <div class="match-score-title">РАХУНОК МАТЧУ</div>
        <div class="match-score">{{ setWins(2) }}</div>

        <div class="set-history">
          <div v-for="index in 4" :key="`t2-${index}`" class="set-cell">
            <span>Партія {{ index }}</span>
            <strong>{{ setScore(2, index - 1) }}</strong>
          </div>
        </div>

        <div class="volley-meta">Таймаути: {{ scoreboard.team2.timeoutsUsed }}</div>
      </section>
    </div>
  </div>
</template>
<style scoped>
.screen-display {
  width: 100vw;
  height: 100dvh;
  min-height: 100dvh;
  box-sizing: border-box;
  padding: clamp(16px, 2.2vw, 38px);
  overflow: hidden;
  background:
    radial-gradient(circle at 25% 20%, color-mix(in srgb, var(--team1-color) 22%, transparent), transparent 30%),
    radial-gradient(circle at 80% 25%, color-mix(in srgb, var(--team2-color) 22%, transparent), transparent 30%),
    #03050a;
  color: #f8fafc;
  font-family: var(--board-font);
  display: flex;
  align-items: center;
  justify-content: center;
}

.screen-display.is-preview {
  width: 100%;
  height: 100%;
  min-height: 0;
  padding: 12px;
  border-radius: 22px;
}

.basketball-board,
.volleyball-board {
  width: 100%;
  max-width: 1680px;
  display: grid;
  align-items: stretch;
  justify-content: center;
  overflow: hidden;
}

.basketball-board {
  height: min(78vh, 720px);
  grid-template-columns: minmax(280px, 1fr) clamp(220px, 18vw, 330px) minmax(280px, 1fr);
  gap: clamp(18px, 2.8vw, 42px);
}

.volleyball-board {
  height: min(84vh, 820px);
  grid-template-columns: minmax(300px, 0.95fr) minmax(360px, 1.1fr) minmax(300px, 0.95fr);
  gap: clamp(16px, 2vw, 34px);
}

.team-card,
.center-card,
.volley-team {
  background: rgba(3, 7, 18, 0.92);
  border-radius: clamp(22px, 2vw, 34px);
  padding: clamp(16px, 2.2vw, 34px);
  box-shadow: 0 0 46px rgba(0, 0, 0, 0.72);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.center-card {
  border: 2px solid rgba(148, 163, 184, 0.32);
}

.left-team {
  border: 3px solid var(--team1-color);
  box-shadow: 0 0 38px color-mix(in srgb, var(--team1-color) 26%, transparent);
}

.right-team {
  border: 3px solid var(--team2-color);
  box-shadow: 0 0 38px color-mix(in srgb, var(--team2-color) 26%, transparent);
}

.team-label {
  font-size: clamp(12px, 1.2vw, 22px);
  letter-spacing: 0.2em;
  color: #94a3b8;
  margin-bottom: clamp(6px, 1vw, 12px);
  text-align: center;
}

.team-name {
  width: 100%;
  font-size: clamp(28px, 4vw, 76px);
  font-weight: 1000;
  text-transform: uppercase;
  text-align: center;
  line-height: 0.98;
  overflow-wrap: anywhere;
  margin-bottom: clamp(14px, 2vw, 26px);
}

.left-team .team-name,
.left-team .team-score,
.left-team .match-score,
.current-score-left {
  color: var(--team1-color);
  text-shadow: 0 0 22px color-mix(in srgb, var(--team1-color) 48%, transparent);
}

.right-team .team-name,
.right-team .team-score,
.right-team .match-score,
.current-score-right {
  color: var(--team2-color);
  text-shadow: 0 0 22px color-mix(in srgb, var(--team2-color) 48%, transparent);
}

.team-score {
  font-size: clamp(96px, 12vw, 220px);
  font-weight: 1000;
  line-height: 0.88;
  letter-spacing: 3px;
}

.current-score {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: clamp(8px, 1.6vw, 22px);
  font-size: clamp(90px, 12vw, 220px);
  font-weight: 1000;
  line-height: 0.82;
}

.score-divider {
  color: #f8fafc;
  font-size: 0.55em;
  opacity: 0.85;
}

.period {
  font-size: clamp(26px, 3.5vw, 56px);
  font-weight: 1000;
  color: #e2e8f0;
  text-align: center;
}

.clock {
  font-size: clamp(44px, 6vw, 94px);
  font-weight: 1000;
  line-height: 1;
  margin: clamp(10px, 1.8vw, 18px) 0;
  letter-spacing: 2px;
  text-align: center;
}

.status,
.match-summary {
  font-size: clamp(18px, 2vw, 32px);
  color: #94a3b8;
  text-transform: uppercase;
  text-align: center;
}

.team-meta,
.volley-meta {
  margin-top: clamp(14px, 2vw, 26px);
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: clamp(16px, 1.7vw, 27px);
  font-weight: 800;
  color: #e2e8f0;
  text-align: center;
}

.set-history {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(8px, 1vw, 12px);
}

.set-cell {
  min-height: clamp(58px, 7vh, 94px);
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: rgba(15, 23, 42, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.set-cell span {
  font-size: clamp(11px, 1vw, 15px);
  color: #94a3b8;
  font-weight: 800;
}

.set-cell strong {
  font-size: clamp(22px, 2.8vw, 46px);
  line-height: 1;
  margin-top: 4px;
}

.shot-clock-box {
  min-width: clamp(90px, 8vw, 140px);
  padding: clamp(8px, 1.2vw, 14px) clamp(12px, 1.8vw, 20px);
  border-radius: 20px;
  border: 2px solid rgba(250, 204, 21, 0.8);
  background: rgba(250, 204, 21, 0.09);
  text-align: center;
  margin-bottom: 12px;
}

.shot-clock-box span {
  display: block;
  font-size: clamp(12px, 1vw, 16px);
  color: #fde68a;
  letter-spacing: 0.14em;
}

.shot-clock-box strong {
  display: block;
  font-size: clamp(34px, 4vw, 64px);
  line-height: 1;
  color: #facc15;
}

.is-preview .basketball-board,
.is-preview .volleyball-board {
  height: 100%;
  gap: 10px;
}

.is-preview .team-card,
.is-preview .center-card,
.is-preview .volley-team {
  border-radius: 16px;
  padding: 10px;
}

.is-preview .team-name {
  font-size: clamp(16px, 2.1vw, 28px);
}

.is-preview .team-score,
.is-preview .current-score {
  font-size: clamp(42px, 5vw, 76px);
}

.is-preview .clock {
  font-size: clamp(24px, 3vw, 44px);
}

.is-preview .period {
  font-size: clamp(18px, 2.5vw, 32px);
}

.is-preview .set-cell {
  min-height: 44px;
}

@media (max-aspect-ratio: 4 / 3) {
  .basketball-board,
  .volleyball-board {
    grid-template-columns: 1fr;
    height: auto;
    max-height: 100%;
  }

  .screen-display:not(.is-preview) {
    overflow: auto;
    align-items: flex-start;
  }
}
</style>