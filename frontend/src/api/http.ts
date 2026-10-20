import request from './request.ts'

// 由于响应拦截器已 return response.data，这里统一把返回值断言为业务数据类型
export const http = {
  get<T = unknown>(url: string, params?: unknown) {
    return request({ url, method: 'get', params }) as unknown as Promise<T>
  },
  post<T = unknown>(url: string, data?: unknown) {
    return request({ url, method: 'post', data }) as unknown as Promise<T>
  },
  put<T = unknown>(url: string, data?: unknown) {
    return request({ url, method: 'put', data }) as unknown as Promise<T>
  },
  delete<T = unknown>(url: string, params?: unknown) {
    return request({ url, method: 'delete', params }) as unknown as Promise<T>
  },
}

export default http
