<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true

  try {
    await auth.login(email.value, password.value)
    await router.push('/dashboard')
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">
    <div class="card login-card">
      <h1>Admin Login</h1>

      <input v-model="email" type="email" placeholder="Email" />
      <input v-model="password" type="password" placeholder="Password" />

      <button @click="submit" :disabled="loading">
        {{ loading ? 'Loading...' : 'Login' }}
      </button>

      <p v-if="error" class="error-text">{{ error }}</p>
    </div>
  </div>
</template>

<style scoped>
.page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.login-card {
  width: 100%;
  max-width: 420px;
}

.card {
  background: #161b22;
  border: 1px solid #2b313c;
  border-radius: 16px;
  padding: 24px;
}

input {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid #394150;
  background: #0f141b;
  color: #fff;
}

button {
  margin-top: 16px;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: 10px;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
}

.error-text {
  margin-top: 12px;
  color: #f87171;
}
</style>