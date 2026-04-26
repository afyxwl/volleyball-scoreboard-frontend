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
        const response = await api.post('/auth/login', { email, password })

        console.log('LOGIN RESPONSE:', response.data)

        const data = response.data.data
        const token = data.token

        if (!token) {
          throw new Error('Token was not returned from /auth/login')
        }

        this.token = token
        this.user = data.user ?? null

        localStorage.setItem('access_token', token)
        api.defaults.headers.common.Authorization = `Bearer ${token}`

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
      delete api.defaults.headers.common.Authorization
    },
  },
})