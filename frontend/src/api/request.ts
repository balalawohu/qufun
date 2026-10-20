import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 3000,
})

request.interceptors.request.use(
  (config) => {
    // 这个地方需要自动添加token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (err) => {
    return Promise.reject(err)
  },
)

request.interceptors.response.use(
  (response) => {
    // 这个地方返回的只有HTTP状态码为200的时候，只有当HTTP状态码非200的时候，才会进入到下面这个err里面
    return response.data
  },
  (err) => {
    // 这个里面是对不同的HTTP状态码进行处理
    return Promise.reject(err)
  },
)

export default request
