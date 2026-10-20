<script setup lang="ts">
import { reactive } from 'vue'
import { useUserStore } from '@/stores/user'

const userInfo = reactive({
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: '',
  agree: '',
})

function register() {
  if (userInfo.password !== userInfo.confirmPassword) {
    alert('密码不一致') // 这个地方可以更换一下，如果说两次输入密码不一致，显示信息提示在输入框下面，而不是使用弹窗进行显示
    return
  }
  if (!userInfo.agree) {
    alert('请同意协议') // 这个地方可以更换一下，自己封装一个组件进行显示，这样自己可以更换一下组件样式，可以更好看一点
    return
  }
  const userStore = useUserStore()
  userStore.register(userInfo)
}
</script>

<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-card-top">
        <h2>趣分</h2>
        <p>加入趣分, 探索更多资源!!!</p>
      </div>
      <div class="register-card-main">
        <div class="register-input">
          <label for="username">用户名</label>
          <input type="text" id="username" v-model="userInfo.username" placeholder="请输入用户名" />
        </div>
        <div class="register-input">
          <label for="phone">手机号</label>
          <input type="text" id="phone" v-model="userInfo.phone" placeholder="请输入手机号" />
        </div>
        <div class="register-input">
          <label for="email">邮箱</label>
          <input type="text" id="email" v-model="userInfo.email" placeholder="请输入邮箱" />
        </div>
        <div class="register-input">
          <label for="password">密码</label>
          <input
            type="password"
            id="password"
            v-model="userInfo.password"
            placeholder="请输入密码"
          />
        </div>
        <div class="register-input">
          <label for="confirmPassword">确认密码</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="userInfo.confirmPassword"
            placeholder="请输入确认密码"
          />
        </div>
        <div class="register-input">
          <label for="agree">同意协议</label>
          <input type="checkbox" id="agree" v-model="userInfo.agree" />
        </div>
        <button type="button" class="register-submit" @click="register">注册</button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
