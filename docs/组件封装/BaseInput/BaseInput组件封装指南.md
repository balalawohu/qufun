# BaseInput 基础输入组件封装指南

目标：封装一个统一的输入框组件，替代 `RegisterPage.vue` 中重复的 label + input 结构，并支持**行内错误提示**（替代 `alert('密码不一致')`）、密码可见切换等能力。

技术栈：Vue 3.5 + TypeScript + Vite。

---

## 一、需求分析

### 1.1 现状问题

`src/views/RegisterPage.vue` 中 5 个输入框结构完全一致：

```html
<div class="register-input">
  <label for="username">用户名</label>
  <input type="text" id="username" v-model="userInfo.username" placeholder="请输入用户名">
</div>
```

同时校验失败时使用 `alert()`：

```ts
if (userInfo.password !== userInfo.confirmPassword) {
  alert('密码不一致')
  return
}
```

### 1.2 期望效果

```vue
<BaseInput v-model="form.username" label="用户名" placeholder="请输入用户名" :error="errors.username" />
<BaseInput v-model="form.password" label="密码" type="password" :error="errors.password" />
<BaseInput v-model="form.confirmPassword" label="确认密码" type="password" :error="errors.confirmPassword" />
```

错误提示显示在输入框正下方，输入框变红框，无需弹窗。

---

## 二、核心设计决策：错误信息由谁产生

这是本组件最关键的设计问题。

### 2.1 两种方案对比

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. 组件内部校验 | 组件接收 `rules`，内部校验并保存错误 | 调用简单 | 无法处理跨字段、后端、异步校验 |
| B. 错误由外部传入（推荐） | 组件只接收 `error` prop 并展示 | 灵活、职责单一、可覆盖所有场景 | 父组件需自己维护错误状态 |

### 2.2 为什么选方案 B

组件内部校验做不了三类场景：

1. **跨字段校验**：`确认密码 !== 密码`，单个输入框拿不到另一个字段的值
2. **后端返回错误**：如"该邮箱已被注册"，错误来源自接口响应
3. **异步校验**：用户名是否已占用，需要请求接口

因此分工为：

```
父组件 / composable  →  计算错误（errors 对象）
BaseInput            →  只负责展示错误
```

这就是**受控组件**思想：状态在外部，组件只做渲染。

---

## 三、涉及的知识点

| 知识点 | 作用 |
| --- | --- |
| `defineModel` | 实现 `v-model` 双向绑定，无需手写 `update:modelValue` |
| `defineProps` + `withDefaults` | 类型安全的 props 与默认值 |
| `v-bind="$attrs"` / `inheritAttrs` | 透传原生属性（`maxlength`、`autocomplete` 等） |
| 条件 class `:class` | 错误态联动红框样式 |
| 具名插槽 | 支持前缀图标、后缀插槽（如发送验证码按钮） |
| `watch` | 父组件中实时校验并清除错误 |
| 无障碍属性 | `aria-invalid`、`aria-describedby` |
| `scoped` 样式 | 样式隔离 |

---

## 四、Props 设计

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `modelValue` | `string` | `''` | 由 `defineModel` 生成 |
| `label` | `string` | `''` | 左侧/上方标签 |
| `type` | `'text' \| 'password' \| 'email' \| 'tel'` | `'text'` | 输入类型 |
| `placeholder` | `string` | `''` | 占位提示 |
| `error` | `string` | `''` | 错误信息，空字符串表示无错误 |
| `disabled` | `boolean` | `false` | 禁用 |
| `clearable` | `boolean` | `false` | 是否显示清除按钮 |
| `showPassword` | `boolean` | `false` | 密码框是否显示可见切换按钮 |
| `maxlength` | `number` | 无 | 最大长度 |

设计原则：**只暴露与展示相关的 props，不暴露校验逻辑**。

---

## 五、完整实现 `src/components/base/BaseInput.vue`

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'

const model = defineModel<string>({ default: '' })

const props = withDefaults(
  defineProps<{
    label?: string
    type?: 'text' | 'password' | 'email' | 'tel'
    placeholder?: string
    error?: string
    disabled?: boolean
    clearable?: boolean
    showPassword?: boolean
    maxlength?: number
  }>(),
  {
    label: '',
    type: 'text',
    placeholder: '',
    error: '',
    disabled: false,
    clearable: false,
    showPassword: false
  }
)

const emit = defineEmits<{
  (e: 'blur', event: FocusEvent): void
  (e: 'enter', value: string): void
}>()

// 密码可见切换属于组件内部状态，不需要父组件管理
const passwordVisible = ref(false)
const inputType = computed(() =>
  props.type === 'password' && passwordVisible.value ? 'text' : props.type
)

const isPassword = computed(() => props.type === 'password')
const hasError = computed(() => !!props.error)
const showClear = computed(() => props.clearable && !props.disabled && !!model.value)

function togglePassword() {
  passwordVisible.value = !passwordVisible.value
}

function clear() {
  model.value = ''
}
</script>

<template>
  <div class="base-input" :class="{ 'is-error': hasError, 'is-disabled': disabled }">
    <label v-if="label" class="base-input__label">{{ label }}</label>

    <div class="base-input__wrapper">
      <slot name="prefix" />

      <input
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="disabled"
        :maxlength="maxlength"
        :aria-invalid="hasError"
        class="base-input__inner"
        @blur="emit('blur', $event)"
        @keyup.enter="emit('enter', model)"
      />

      <button
        v-if="showClear"
        type="button"
        class="base-input__action"
        aria-label="清除"
        @click="clear"
      >
        ×
      </button>

      <button
        v-if="isPassword && showPassword"
        type="button"
        class="base-input__action"
        :aria-label="passwordVisible ? '隐藏密码' : '显示密码'"
        @click="togglePassword"
      >
        {{ passwordVisible ? '🙈' : '👁' }}
      </button>

      <slot name="suffix" />
    </div>

    <p v-if="hasError" class="base-input__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.base-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.base-input__label {
  font-size: 14px;
  color: #333;
}

.base-input__wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  padding: 0 10px;
  background: #fff;
  transition: border-color 0.2s;
}

.base-input__wrapper:focus-within {
  border-color: #1677ff;
}

.base-input.is-error .base-input__wrapper {
  border-color: #ff4d4f;
}

.base-input.is-disabled .base-input__wrapper {
  background: #f5f5f5;
  cursor: not-allowed;
}

.base-input__inner {
  flex: 1;
  border: none;
  outline: none;
  height: 36px;
  font-size: 14px;
  background: transparent;
  color: #333;
}

.base-input__inner:disabled {
  cursor: not-allowed;
  color: #999;
}

.base-input__action {
  border: none;
  background: transparent;
  cursor: pointer;
  color: #999;
  font-size: 14px;
  padding: 0 2px;
}

.base-input__error {
  margin: 0;
  font-size: 12px;
  color: #ff4d4f;
}
</style>
```

### 关键实现点说明

1. **`defineModel`**：一行搞定 `v-model`，父组件无需监听 `update:modelValue`
2. **`inputType` computed**：密码可见切换只改 `type`，不动父组件状态
3. **`hasError` computed**：统一驱动红框（`.is-error`）与错误文案显示
4. **`:focus-within`**：聚焦整个容器变蓝，比只给 input 加样式更好看
5. **`prefix` / `suffix` 插槽**：预留图标或"发送验证码"按钮位置
6. **错误提示不占位**：`v-if` 控制，无错误时无额外高度

---

## 六、父组件中的校验写法

### 6.1 基础：reactive 维护 errors

```vue
<script setup lang="ts">
import { reactive, watch } from 'vue'
import BaseInput from '@/components/base/BaseInput.vue'

const form = reactive({
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  username: '',
  phone: '',
  email: '',
  password: '',
  confirmPassword: ''
})

// 密码一致性：跨字段校验
watch(
  () => [form.password, form.confirmPassword],
  () => {
    if (!form.confirmPassword) {
      errors.confirmPassword = ''
      return
    }
    errors.confirmPassword = form.confirmPassword !== form.password ? '两次输入的密码不一致' : ''
  }
)

// 失焦校验单个字段
function validateUsername() {
  if (!form.username) errors.username = '请输入用户名'
  else if (form.username.length < 3) errors.username = '用户名至少 3 个字符'
  else errors.username = ''
}

function validateEmail() {
  const reg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  errors.email = reg.test(form.email) ? '' : '邮箱格式不正确'
}

// 提交前整体校验
function validateAll(): boolean {
  validateUsername()
  validateEmail()
  if (!form.password) errors.password = '请输入密码'
  if (!form.confirmPassword) errors.confirmPassword = '请再次输入密码'
  return Object.values(errors).every(e => !e)
}

async function handleRegister() {
  if (!validateAll()) return
  try {
    await AuthAPI.register(form)
  } catch (err: any) {
    // 后端返回错误也能直接塞进 errors
    if (err.field === 'email') errors.email = err.message
  }
}
</script>

<template>
  <BaseInput v-model="form.username" label="用户名" placeholder="请输入用户名" :error="errors.username" @blur="validateUsername" />
  <BaseInput v-model="form.email" label="邮箱" type="email" placeholder="请输入邮箱" :error="errors.email" @blur="validateEmail" />
  <BaseInput v-model="form.password" label="密码" type="password" show-password :error="errors.password" />
  <BaseInput v-model="form.confirmPassword" label="确认密码" type="password" show-password :error="errors.confirmPassword" />
</template>
```

### 6.2 校验时机建议

| 时机 | 行为 |
| --- | --- |
| 首次失焦 `blur` | 校验并报错（不要一开始就标红） |
| 已报错后输入 | 实时清除错误（避免边打字边报红） |
| 提交时 | 全量校验，不通过则阻止提交 |
| 接口返回错误 | 写入对应字段的 `errors` |

---

## 七、进阶：字段多了之后用 `useForm`

当多个页面都有表单时，把重复的 `errors` + `validate` 逻辑抽成组合式函数 `src/composables/useForm.ts`：

```ts
import { reactive, computed } from 'vue'

type Rules<T> = {
  [K in keyof T]?: (value: T[K], form: T) => string
}

export function useForm<T extends Record<string, any>>(initial: T, rules: Rules<T>) {
  const form = reactive({ ...initial }) as T
  const errors = reactive<Record<string, string>>({})
  const touched = reactive<Record<string, boolean>>({})

  function validateField(key: keyof T) {
    const rule = rules[key]
    errors[key as string] = rule ? rule(form[key], form) : ''
    return !errors[key as string]
  }

  function validateAll() {
    return (Object.keys(rules) as (keyof T)[]).map(validateField).every(Boolean)
  }

  const isValid = computed(() => Object.values(errors).every(e => !e))

  function reset() {
    Object.assign(form, initial)
    Object.keys(errors).forEach(k => (errors[k] = ''))
    Object.keys(touched).forEach(k => (touched[k] = false))
  }

  return { form, errors, touched, validateField, validateAll, isValid, reset }
}
```

使用：

```ts
const { form, errors, validateField, validateAll } = useForm(
  { username: '', email: '', password: '', confirmPassword: '' },
  {
    username: v => (v.length < 3 ? '用户名至少 3 个字符' : ''),
    email: v => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : '邮箱格式不正确'),
    confirmPassword: (v, f) => (v !== f.password ? '两次输入的密码不一致' : '')
  }
)
```

注意：规则函数第二个参数传入整个 `form`，因此跨字段校验可以自然实现。

> 何时引入：有 2 个以上表单页面时。只有一个注册页时直接写 `reactive` 即可，不要过度设计。

---

## 八、更进阶：`BaseForm` + `BaseFormItem`（可选）

Element Plus 风格的写法，用 `provide/inject` 实现：

- `BaseForm` 提供 `provide` 注册表，暴露 `validate()`
- `BaseFormItem` 注入表单，接收 `prop`（字段名）和 `rules`，自动显示对应错误
- `BaseInput` 只管输入

```vue
<BaseForm :model="form" :rules="rules" ref="formRef">
  <BaseFormItem prop="username" label="用户名">
    <BaseInput v-model="form.username" />
  </BaseFormItem>
</BaseForm>
```

代价是复杂度显著上升，建议等表单场景稳定后再引入。

---

## 九、常见坑与排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 输入无反应 | 未用 `defineModel` 或未监听 `update:modelValue` | 使用 `defineModel` |
| 错误提示不显示 | `error` 传了 `null` / `undefined` | 统一传空字符串 `''` |
| 错误框不变红 | 未加 `.is-error` class 绑定 | `:class="{ 'is-error': hasError }"` |
| 一输入就报红 | 校验写在 `input` 事件 | 改为 `blur` 时首次校验 |
| 密码切换无效 | `type` 写死为 `password` | 用 computed 计算 `inputType` |
| `maxlength` 不生效 | 未透传原生属性 | 显式声明或用 `v-bind="$attrs"` |
| 错误提示撑开布局抖动 | 用 `visibility` 隐藏 | 用 `v-if`，无错误时完全不渲染 |

---

## 十、自测清单

- [ ] `v-model` 双向绑定正常
- [ ] 传入 `error` 时显示红框 + 下方提示
- [ ] `error` 为空时提示消失且不占位
- [ ] 密码可见切换正常，`type` 在 `password` / `text` 间切换
- [ ] `disabled` 时不可输入且样式置灰
- [ ] `clearable` 清除按钮可用
- [ ] `prefix` / `suffix` 插槽内容正确渲染
- [ ] 回车触发 `enter` 事件
- [ ] 失焦触发 `blur` 事件
- [ ] 键盘 Tab 可聚焦，屏幕阅读器可读取错误（`aria-invalid`）

---

## 十一、提交前注意

项目已配置 husky + lint-staged，提交时自动执行 `oxlint --fix`、`eslint --fix --cache`、`prettier --write`：

1. 不加分号、单引号、行宽 100（遵循 `.prettierrc.json`）
2. 提交信息使用约定式格式，例如：`feat: 新增 BaseInput 基础输入组件`
3. 提交前可本地执行 `cd frontend && npm run lint` 自查
