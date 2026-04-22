<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'

type Screen = {
  id: number
  name?: string
  slug?: string
  isActive?: boolean
}

const screens = ref<Screen[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const formError = ref('')

const name = ref('')
const slug = ref('')

async function loadScreens() {
  try {
    loading.value = true
    error.value = ''
    const response = await api.get('/screens')
    const payload = response.data?.data ?? response.data
    screens.value = Array.isArray(payload) ? payload : []
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити екрани'
  } finally {
    loading.value = false
  }
}

async function createScreen() {
  try {
    formError.value = ''

    if (!name.value.trim()) {
      formError.value = 'Назва екрана обовʼязкова'
      return
    }

    saving.value = true

    await api.post('/screens', {
      name: name.value.trim(),
      slug: slug.value.trim() || null,
    })

    name.value = ''
    slug.value = ''

    await loadScreens()
  } catch (err: any) {
    console.error(err)
    formError.value = err?.response?.data?.message || 'Не вдалося створити екран'
  } finally {
    saving.value = false
  }
}

onMounted(loadScreens)
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Screens</h1>
        <p class="subtitle">Створення екранів і перехід до керування табло</p>
      </div>

      <RouterLink to="/dashboard">← Dashboard</RouterLink>
    </div>

    <div class="layout">
      <section class="card">
        <h2>Create screen</h2>

        <label>
          Name
          <input v-model="name" placeholder="Main Screen" />
        </label>

        <label>
          Slug
          <input v-model="slug" placeholder="main-screen" />
        </label>

        <button @click="createScreen" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create screen' }}
        </button>

        <p v-if="formError" class="error-text">{{ formError }}</p>
      </section>

      <section class="card">
        <h2>Screens list</h2>

        <p v-if="loading">Завантаження...</p>
        <p v-else-if="error" class="error-text">{{ error }}</p>
        <p v-else-if="screens.length === 0" class="empty-text">Екранів поки немає</p>

        <div v-else class="screens-list">
          <div v-for="screen in screens" :key="screen.id" class="screen-item">
            <div>
              <strong>{{ screen.name || `Screen ${screen.id}` }}</strong>
              <div>ID: {{ screen.id }}</div>
              <div>Slug: {{ screen.slug || '—' }}</div>
            </div>

            <RouterLink :to="`/screens/${screen.id}/control`">
              Control
            </RouterLink>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
}
.header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  margin-bottom: 24px;
}
.subtitle {
  opacity: 0.75;
  margin-top: 4px;
}
.layout {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 20px;
}
.card {
  background: #161b22;
  border: 1px solid #2b313c;
  border-radius: 16px;
  padding: 20px;
}
label {
  display: block;
  margin-bottom: 14px;
}
input {
  width: 100%;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #394150;
  background: #0f141b;
  color: #fff;
}
button {
  width: 100%;
  margin-top: 8px;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}
.screens-list {
  display: grid;
  gap: 12px;
}
.screen-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  background: #0f141b;
  border: 1px solid #2b313c;
  border-radius: 12px;
  padding: 14px;
}
.error-text {
  color: #f87171;
  margin-top: 12px;
}
.empty-text {
  opacity: 0.8;
}
</style>