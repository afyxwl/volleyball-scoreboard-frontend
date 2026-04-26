<script setup lang="ts">
defineProps<{
  match: {
    team1: { name: string; score: number; timeoutsUsed: number }
    team2: { name: string; score: number; timeoutsUsed: number }
    currentSet: number
    periodTime: string
    status: string
  }
}>()
</script>

<template>
  <div class="preview">
    <div class="teams">
      <div>{{ match.team1.name }}</div>
      <div>{{ match.team1.score }}</div>
    </div>

    <div class="center">
      <div>SET {{ match.currentSet }}</div>
      <div>{{ match.periodTime }}</div>
      <div>{{ match.status }}</div>
    </div>

    <div class="teams">
      <div>{{ match.team2.name }}</div>
      <div>{{ match.team2.score }}</div>
    </div>

    <div class="timeouts">
      <span>T1 TO: {{ match.team1.timeoutsUsed }}</span>
      <span>T2 TO: {{ match.team2.timeoutsUsed }}</span>
    </div>
  </div>
</template>