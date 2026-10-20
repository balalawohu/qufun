import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { AuthAPI, type LoginParams, type RegisterParams } from '@/api'

const TOKEN_KEY = 'token'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY))
  // 根据上面获取的token来判断是否处于登录态，如果说是登录态就返回true，否则返回false
  const isLoggedIn = computed(() => token.value !== null)
  async function login(payload: LoginParams) {
    const res = await AuthAPI.login(payload)
    // 后端返回的 token 字段名按实际调整（token / data.token）
    const newToken = (res as { token?: string })?.token
    if (newToken) {
      token.value = newToken
      localStorage.setItem(TOKEN_KEY, newToken)
    }
    return res
  }

  async function register(payload: RegisterParams) {
    return await AuthAPI.register(payload)
  }

  function logout() {
    token.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, isLoggedIn, login, register, logout }
})
