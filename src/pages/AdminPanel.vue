<script setup lang="ts">
import { onMounted, ref } from 'vue'
import api from '../services/api'

const users = ref<any[]>([])
const screens = ref<any[]>([])
const loading = ref(true)
const error = ref('')
const success = ref('')

const selectedUsers = ref<Record<number, number | null>>({})

async function loadData() {
  try {
    loading.value = true
    error.value = ''

    const [usersRes, screensRes] = await Promise.all([
      api.get('/users'),
      api.get('/screens'),
    ])

    users.value = usersRes.data?.data ?? usersRes.data ?? []
    screens.value = screensRes.data?.data ?? screensRes.data ?? []

    screens.value.forEach((screen) => {
      selectedUsers.value[screen.id] = screen.userId ?? screen.user_id ?? null
    })
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити дані'
  } finally {
    loading.value = false
  }
}

async function deleteUser(id: number) {
  if (!confirm('Видалити цього адміністратора?')) return

  try {
    await api.delete(`/users/${id}`)
    success.value = 'Користувача видалено'
    await loadData()
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося видалити користувача'
  }
}

async function deleteScreen(id: number) {
  if (!confirm('Видалити цей екран?')) return

  try {
    await api.delete(`/screens/${id}`)
    success.value = 'Екран видалено'
    await loadData()
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося видалити екран'
  }
}

async function assignScreen(screenId: number) {
  try {
    await api.patch(`/screens/${screenId}/assign`, {
      userId: selectedUsers.value[screenId],
    })

    success.value = 'Екран привʼязано до адміністратора'
    await loadData()
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося привʼязати екран'
  }
}

onMounted(loadData)
</script>

<template>
  <main class="admin-page">
    <header class="admin-header">
      <div>
        <h1>Панель суперадміна</h1>
        <p>Керування адміністраторами та екранами</p>
      </div>

      <RouterLink to="/dashboard" class="btn">← Назад</RouterLink>
    </header>

    <p v-if="loading">Завантаження...</p>
    <p v-if="error" class="error-text">{{ error }}</p>
    <p v-if="success" class="success-text">{{ success }}</p>

    <section class="admin-grid" v-if="!loading">
      <div class="card">
        <h2>Адміністратори</h2>

        <div v-for="user in users" :key="user.id" class="list-row">
          <div>
            <strong>{{ user.fullName || user.full_name || 'Без імені' }}</strong>
            <p>{{ user.email }}</p>
            <small>Роль: {{ user.role }}</small>
          </div>

          <button class="btn btn-red" @click="deleteUser(user.id)">
            Видалити
          </button>
        </div>
      </div>

      <div class="card">
        <h2>Екрани</h2>

        <div v-for="screen in screens" :key="screen.id" class="screen-row">
          <div>
            <strong>{{ screen.name || `Екран ${screen.id}` }}</strong>
            <p>ID: {{ screen.id }}</p>
          </div>

          <label>
            Адміністратор
            <select v-model="selectedUsers[screen.id]" class="input">
              <option :value="null">Без адміністратора</option>
              <option v-for="user in users" :key="user.id" :value="user.id">
                {{ user.email }}
              </option>
            </select>
          </label>

          <div class="row">
            <button class="btn" @click="assignScreen(screen.id)">
              Привʼязати
            </button>

            <button class="btn btn-red" @click="deleteScreen(screen.id)">
              Видалити
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.admin-page {
  min-height: 100vh;
  padding: 32px;
  background: var(--bg);
  color: var(--text);
}

.admin-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.admin-header h1 {
  font-size: 44px;
}

.admin-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.list-row,
.screen-row {
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 16px;
  margin-top: 14px;
  display: grid;
  gap: 12px;
}

.row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.error-text {
  color: var(--red);
}

.success-text {
  color: var(--blue);
}

@media (max-width: 800px) {
  .admin-page {
    padding: 18px;
  }

  .admin-grid {
    grid-template-columns: 1fr;
  }

  .admin-header h1 {
    font-size: 32px;
  }
}
</style>