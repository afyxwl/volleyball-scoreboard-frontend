<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import api from '../services/api'

type User = {
  id: number
  email: string
  fullName?: string | null
  role?: string
}

const users = ref<User[]>([])
const loading = ref(true)
const error = ref('')
const saving = ref(false)
const formError = ref('')

const fullName = ref('')
const email = ref('')
const password = ref('')
const role = ref<'admin' | 'operator'>('operator')

async function loadUsers() {
  try {
    loading.value = true
    error.value = ''
    const response = await api.get('/users')
    const payload = response.data?.data ?? response.data
    users.value = Array.isArray(payload) ? payload : []
  } catch (err) {
    console.error(err)
    error.value = 'Не вдалося завантажити користувачів'
  } finally {
    loading.value = false
  }
}

async function createUser() {
  try {
    formError.value = ''

    if (!email.value.trim() || !password.value.trim()) {
      formError.value = 'Email і пароль обовʼязкові'
      return
    }

    saving.value = true

    await api.post('/users', {
      fullName: fullName.value.trim() || null,
      email: email.value.trim(),
      password: password.value.trim(),
      role: role.value,
    })

    fullName.value = ''
    email.value = ''
    password.value = ''
    role.value = 'operator'

    await loadUsers()
  } catch (err: any) {
    console.error(err)
    formError.value =
      err?.response?.data?.message || 'Не вдалося створити користувача'
  } finally {
    saving.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="page">
    <div class="header">
      <div>
        <h1>Users</h1>
        <p class="subtitle">Створення і перегляд користувачів системи</p>
      </div>

      <RouterLink to="/dashboard">← Dashboard</RouterLink>
    </div>

    <div class="layout">
      <section class="card">
        <h2>Create user</h2>

        <label>
          Full name
          <input v-model="fullName" placeholder="Anna Admin" />
        </label>

        <label>
          Email
          <input v-model="email" type="email" placeholder="anna@gmail.com" />
        </label>

        <label>
          Password
          <input v-model="password" type="password" placeholder="********" />
        </label>

        <label>
          Role
          <select v-model="role">
            <option value="operator">operator</option>
            <option value="admin">admin</option>
          </select>
        </label>

        <button @click="createUser" :disabled="saving">
          {{ saving ? 'Creating...' : 'Create user' }}
        </button>

        <p v-if="formError" class="error-text">{{ formError }}</p>
      </section>

      <section class="card">
        <h2>Users list</h2>

        <p v-if="loading">Завантаження...</p>
        <p v-else-if="error" class="error-text">{{ error }}</p>
        <p v-else-if="users.length === 0" class="empty-text">Користувачів поки немає</p>

        <div v-else class="users-list">
          <div v-for="user in users" :key="user.id" class="user-item">
            <strong>{{ user.fullName || 'No name' }}</strong>
            <span>{{ user.email }}</span>
            <small>Role: {{ user.role || '—' }}</small>
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
input,
select {
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
.users-list {
  display: grid;
  gap: 12px;
}
.user-item {
  display: grid;
  gap: 4px;
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