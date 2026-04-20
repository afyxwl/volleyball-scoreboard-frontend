import { defineStore } from 'pinia'
import api from '../services/api'

type AuthUser = {
  id: number
  email: string
  fullName?: string | null
  role?: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('access_token') || '',
    user: null as AuthUser | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
  },

  actions: {
    async login(email: string, password: string) {
      try {
        const { data } = await api.post('/auth/login', { email, password })

        this.token = data.token
        this.user = data.user ?? null

        localStorage.setItem('access_token', data.token)

        await this.fetchMe()
      } catch (error) {
        console.error('Login error:', error)
        throw error
      }
    },

    async fetchMe() {
      const { data } = await api.get('/auth/me')
      this.user = data
    },

    logout() {
      this.token = ''
      this.user = null
      localStorage.removeItem('access_token')
    },
  },
})