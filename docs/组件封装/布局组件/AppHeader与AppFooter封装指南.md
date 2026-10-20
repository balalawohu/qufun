# AppHeader 与 AppFooter 布局组件封装指南

目标：封装站点全局的页头与页脚，统一承载 Logo、主导航、搜索入口、用户菜单、页脚信息等，供 `BaseLayout.vue` 组合使用。

技术栈：Vue 3.5 + TypeScript + Vue Router 5 + Pinia。

---

## 一、需求分析

### 1.1 资源分享平台页头需要具备的能力

| 区域 | 内容 | 与登录态的关系 |
| --- | --- | --- |
| 左侧 | Logo + 站点名「趣分」 | 无关 |
| 中部 | 主导航：首页 / 分类 / 排行榜 | 无关 |
| 中部 | 搜索框 | 无关 |
| 右侧（未登录） | 登录 / 注册 按钮 | 未登录时显示 |
| 右侧（已登录） | 上传按钮 + 头像下拉菜单（个人中心 / 我的资源 / 退出） | 登录后显示 |

### 1.2 页脚需要具备的能力

- 关于我们、帮助中心、意见反馈等链接
- 版权信息、备案号占位
- 友情链接 / 社交平台入口
- 移动端可折叠或简化

### 1.3 期望效果

```vue
<BaseLayout>
  <RouterView />
</BaseLayout>
```

`BaseLayout` 内部固定组合 `<AppHeader />` + `<slot />` + `<AppFooter />`，页面只关心自己的内容。

---

## 二、涉及的知识点

| 知识点 | 作用 |
| --- | --- |
| `<RouterLink>` / `useRoute` | 导航跳转与当前路由高亮 |
| Pinia store | 读取登录态 `isLoggedIn`、用户信息、调用 `logout` |
| `computed` | 根据登录态派生右侧区域内容 |
| 具名插槽 | 允许页面自定义导航区、右侧操作区（如某些页面隐藏搜索） |
| `defineProps` + `withDefaults` | 控制是否显示搜索、是否固定顶栏 |
| 组合式函数 `onClickOutside` | 点击外部关闭用户下拉菜单 |
| `Transition` | 下拉菜单动画 |
| `position: sticky` / `fixed` | 吸顶效果 |
| CSS 变量 | 统一主题色、高度，便于后续换肤 |
| 响应式媒体查询 | 移动端折叠为汉堡菜单 |

---

## 三、Props 与插槽设计

### 3.1 AppHeader

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `fixed` | `boolean` | `true` | 是否吸顶 |
| `showSearch` | `boolean` | `true` | 是否显示搜索框（首页可能要更大搜索区，可隐藏默认搜索） |
| `showUpload` | `boolean` | `true` | 是否显示上传入口 |
| `navItems` | `NavItem[]` | 默认导航 | 导航项，支持外部覆盖 |

| 插槽 | 用途 |
| --- | --- |
| `default` / `nav` | 自定义导航区域 |
| `actions` | 自定义右侧操作区（默认渲染登录/用户菜单） |
| `logo` | 自定义 Logo |

类型定义 `src/types/layout.ts`：

```ts
export interface NavItem {
  label: string
  path: string
  /** 需要登录才能访问的导航项 */
  auth?: boolean
}
```

### 3.2 AppFooter

| Prop | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `showLinks` | `boolean` | `true` | 是否显示链接区 |
| `compact` | `boolean` | `false` | 紧凑模式（登录/注册页用） |

| 插槽 | 用途 |
| --- | --- |
| `links` | 自定义链接分组 |
| `copyright` | 自定义版权信息 |

---

## 四、完整实现

### 4.1 类型与配置 `src/types/layout.ts`

```ts
export interface NavItem {
  label: string
  path: string
  auth?: boolean
}

export interface FooterLink {
  title: string
  items: { label: string; to?: string; href?: string }[]
}
```

### 4.2 `src/components/business/AppHeader.vue`

```vue
<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import type { NavItem } from '@/types/layout'

const props = withDefaults(
  defineProps<{
    fixed?: boolean
    showSearch?: boolean
    showUpload?: boolean
    navItems?: NavItem[]
  }>(),
  {
    fixed: true,
    showSearch: true,
    showUpload: true,
    navItems: () => [
      { label: '首页', path: '/' },
      { label: '分类', path: '/categories' },
      { label: '排行榜', path: '/rank' }
    ]
  }
)

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const keyword = ref('')
const menuOpen = ref(false)

const visibleNavItems = computed(() =>
  props.navItems.filter(item => !item.auth || userStore.isLoggedIn)
)

function isActive(path: string) {
  return path === '/' ? route.path === '/' : route.path.startsWith(path)
}

function handleSearch() {
  const q = keyword.value.trim()
  if (!q) return
  router.push({ path: '/search', query: { q } })
}

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function goUpload() {
  if (!userStore.isLoggedIn) {
    router.push('/login')
    return
  }
  router.push('/upload')
}

async function handleLogout() {
  menuOpen.value = false
  await userStore.logout()
  router.push('/')
}
</script>

<template>
  <header class="app-header" :class="{ 'is-fixed': fixed }">
    <div class="app-header__inner">
      <slot name="logo">
        <RouterLink to="/" class="app-header__logo">
          <span class="app-header__logo-text">趣分</span>
        </RouterLink>
      </slot>

      <nav class="app-header__nav">
        <slot name="nav">
          <RouterLink
            v-for="item in visibleNavItems"
            :key="item.path"
            :to="item.path"
            class="app-header__nav-item"
            :class="{ 'is-active': isActive(item.path) }"
          >
            {{ item.label }}
          </RouterLink>
        </slot>
      </nav>

      <div v-if="showSearch" class="app-header__search">
        <input
          v-model="keyword"
          type="text"
          placeholder="搜索资源..."
          class="app-header__search-input"
          @keyup.enter="handleSearch"
        />
        <button class="app-header__search-btn" @click="handleSearch">搜索</button>
      </div>

      <div class="app-header__actions">
        <slot name="actions">
          <template v-if="userStore.isLoggedIn">
            <button class="btn btn--primary" @click="goUpload">上传资源</button>

            <div class="app-header__user">
              <button class="app-header__avatar" @click="toggleMenu">
                {{ userStore.username?.charAt(0)?.toUpperCase() || 'U' }}
              </button>
              <Transition name="fade">
                <ul v-if="menuOpen" v-click-outside="() => (menuOpen = false)" class="app-header__menu">
                  <li><RouterLink to="/profile">个人中心</RouterLink></li>
                  <li><RouterLink to="/my/resources">我的资源</RouterLink></li>
                  <li><button @click="handleLogout">退出登录</button></li>
                </ul>
              </Transition>
            </div>
          </template>

          <template v-else>
            <RouterLink to="/login" class="btn">登录</RouterLink>
            <RouterLink to="/register" class="btn btn--primary">注册</RouterLink>
          </template>
        </slot>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height, 60px);
  background: #fff;
  border-bottom: 1px solid #eee;
  z-index: 100;
}

.app-header.is-fixed {
  position: sticky;
  top: 0;
}

.app-header__inner {
  max-width: 1200px;
  height: 100%;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  align-items: center;
  gap: 24px;
}

.app-header__logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #1677ff;
}

.app-header__nav {
  display: flex;
  gap: 16px;
}

.app-header__nav-item {
  font-size: 14px;
  color: #555;
  text-decoration: none;
  padding: 4px 0;
}

.app-header__nav-item.is-active {
  color: #1677ff;
  border-bottom: 2px solid #1677ff;
}

.app-header__search {
  flex: 1;
  display: flex;
  max-width: 360px;
}

.app-header__search-input {
  flex: 1;
  height: 32px;
  padding: 0 10px;
  border: 1px solid #d9d9d9;
  border-right: none;
  border-radius: 4px 0 0 4px;
  outline: none;
}

.app-header__search-btn {
  height: 32px;
  padding: 0 14px;
  border: none;
  background: #1677ff;
  color: #fff;
  border-radius: 0 4px 4px 0;
  cursor: pointer;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.app-header__user {
  position: relative;
}

.app-header__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: #1677ff;
  color: #fff;
  cursor: pointer;
}

.app-header__menu {
  position: absolute;
  right: 0;
  top: 40px;
  min-width: 120px;
  margin: 0;
  padding: 6px 0;
  list-style: none;
  background: #fff;
  border: 1px solid #eee;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.app-header__menu li a,
.app-header__menu li button {
  display: block;
  width: 100%;
  padding: 8px 14px;
  font-size: 14px;
  color: #333;
  text-align: left;
  border: none;
  background: transparent;
  cursor: pointer;
}

.app-header__menu li:hover {
  background: #f5f5f5;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.btn--primary {
  background: #1677ff;
  border-color: #1677ff;
  color: #fff;
}

/* 移动端：隐藏导航，改由汉堡菜单（可后续补充） */
@media (max-width: 768px) {
  .app-header__nav,
  .app-header__search {
    display: none;
  }
}
</style>
```

### 4.3 `src/components/business/AppFooter.vue`

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { FooterLink } from '@/types/layout'

withDefaults(
  defineProps<{
    showLinks?: boolean
    compact?: boolean
    linkGroups?: FooterLink[]
  }>(),
  {
    showLinks: true,
    compact: false,
    linkGroups: () => [
      {
        title: '关于',
        items: [
          { label: '关于趣分', to: '/about' },
          { label: '联系我们', to: '/contact' }
        ]
      },
      {
        title: '帮助',
        items: [
          { label: '帮助中心', to: '/help' },
          { label: '意见反馈', to: '/feedback' }
        ]
      },
      {
        title: '条款',
        items: [
          { label: '用户协议', to: '/terms' },
          { label: '隐私政策', to: '/privacy' }
        ]
      }
    ]
  }
)

const year = new Date().getFullYear()
</script>

<template>
  <footer class="app-footer" :class="{ 'is-compact': compact }">
    <div v-if="showLinks && !compact" class="app-footer__inner">
      <slot name="links">
        <div v-for="group in linkGroups" :key="group.title" class="app-footer__group">
          <h4 class="app-footer__title">{{ group.title }}</h4>
          <ul class="app-footer__list">
            <li v-for="item in group.items" :key="item.label">
              <RouterLink v-if="item.to" :to="item.to">{{ item.label }}</RouterLink>
              <a v-else-if="item.href" :href="item.href" target="_blank" rel="noopener">
                {{ item.label }}
              </a>
            </li>
          </ul>
        </div>
      </slot>
    </div>

    <div class="app-footer__bottom">
      <slot name="copyright">
        <p>© {{ year }} 趣分 QuFun · 资源分享平台</p>
      </slot>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: #fafafa;
  border-top: 1px solid #eee;
  padding: 32px 20px 16px;
}

.app-footer.is-compact {
  padding: 16px 20px;
}

.app-footer__inner {
  max-width: 1200px;
  margin: 0 auto 24px;
  display: flex;
  flex-wrap: wrap;
  gap: 48px;
}

.app-footer__title {
  font-size: 14px;
  margin: 0 0 10px;
  color: #333;
}

.app-footer__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.app-footer__list li {
  margin-bottom: 6px;
}

.app-footer__list a {
  font-size: 13px;
  color: #888;
  text-decoration: none;
}

.app-footer__list a:hover {
  color: #1677ff;
}

.app-footer__bottom {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
  font-size: 12px;
  color: #aaa;
}

@media (max-width: 768px) {
  .app-footer__inner {
    gap: 24px;
  }
}
</style>
```

---

## 五、点击外部关闭菜单的指令

上面用到了 `v-click-outside`，需要注册一个自定义指令 `src/directives/clickOutside.ts`：

```ts
import type { Directive } from 'vue'

export const clickOutside: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    el.__clickOutside__ = (e: MouseEvent) => {
      if (!el.contains(e.target as Node)) binding.value()
    }
    document.addEventListener('click', el.__clickOutside__)
  },
  unmounted(el) {
    document.removeEventListener('click', el.__clickOutside__)
    delete el.__clickOutside__
  }
}
```

在 `main.ts` 中全局注册：

```ts
import { clickOutside } from '@/directives/clickOutside'
app.directive('click-outside', clickOutside)
```

> 也可以在 `src/directives/index.ts` 中统一导出，保持目录整洁。

---

## 六、在 BaseLayout 中组合使用

`src/components/base/BaseLayout.vue`：

```vue
<script setup lang="ts">
import AppHeader from '@/components/business/AppHeader.vue'
import AppFooter from '@/components/business/AppFooter.vue'

withDefaults(
  defineProps<{
    showHeader?: boolean
    showFooter?: boolean
    footerCompact?: boolean
  }>(),
  { showHeader: true, showFooter: true, footerCompact: false }
)
</script>

<template>
  <div class="base-layout">
    <AppHeader v-if="showHeader" />
    <main class="base-layout__main">
      <slot />
    </main>
    <AppFooter v-if="showFooter" :compact="footerCompact" />
  </div>
</template>

<style scoped>
.base-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.base-layout__main {
  flex: 1;
}
</style>
```

页面使用：

```vue
<!-- views/HomePage.vue -->
<BaseLayout>
  <ResourceList :items="items" />
</BaseLayout>
```

登录/注册页使用紧凑页脚：

```vue
<BaseLayout :footer-compact="true">
  <RegisterForm />
</BaseLayout>
```

---

## 七、与登录态的联动要点

1. **依赖 store 的 `isLoggedIn`**：`AppHeader` 通过 `useUserStore()` 读取，登录成功后 store 更新 token，页头自动切换为头像菜单，无需手动刷新
2. **退出登录**：调用 `userStore.logout()`（清除 token 与 localStorage）后 `router.push('/')`
3. **需要登录的入口**：上传按钮在点击时判断 `isLoggedIn`，未登录跳转登录页，可携带 `redirect` 参数：

```ts
router.push({ path: '/login', query: { redirect: route.fullPath } })
```

4. **受保护路由**：页面级权限用路由守卫实现，不要在 Header 里做权限判断

---

## 八、常见坑与排查

| 现象 | 原因 | 解决 |
| --- | --- | --- |
| 导航高亮不生效 | 用字符串全等判断路径 | 用 `route.path.startsWith(path)`，首页特判 |
| 吸顶后内容被遮挡 | `sticky` 占位未考虑 | 给 main 设置 `padding-top` 或改用非 fixed |
| 下拉菜单点不关 | 未做点击外部关闭 | 使用 `v-click-outside` 指令 |
| 登录后页头不更新 | store 未正确更新 token | 确认 `login` 后 `token.value` 已赋值 |
| 移动端布局错乱 | 未设置媒体查询 | 隐藏导航、缩小间距，或加汉堡菜单 |
| 页脚链接 404 | 路由未配置 | 先占位路由，或暂用 `href="#"` |
| 搜索框回车无反应 | 未监听 `keyup.enter` | 绑定 `@keyup.enter="handleSearch"` |

---

## 九、自测清单

**AppHeader**

- [ ] 导航项点击跳转正确，当前页高亮
- [ ] 未登录显示「登录 / 注册」，登录后显示「上传 + 头像」
- [ ] 搜索框回车与点击按钮都能跳转 `/search?q=xxx`
- [ ] 头像菜单可展开、点击外部关闭、ESC 也可考虑关闭
- [ ] 退出登录后页头立即切回未登录态
- [ ] 吸顶生效且滚动时不被内容覆盖
- [ ] 移动端导航隐藏不报错

**AppFooter**

- [ ] 链接分组正常渲染，外链带 `target="_blank" rel="noopener"`
- [ ] `compact` 模式下仅显示版权行
- [ ] 自定义 `links` / `copyright` 插槽可覆盖默认内容
- [ ] 年份自动取当前年

---

## 十、后续可扩展

1. **汉堡菜单**：移动端把导航收进抽屉，配合 `Transition` 做侧滑
2. **主题切换**：把颜色抽成 CSS 变量（已在样式中使用 `var()`），支持深色模式
3. **消息通知**：头像旁加消息红点，需后端配合
4. **搜索联想**：输入时请求接口展示下拉建议，可复用 `BaseDropdown`
5. **滚动隐藏**：向下滚动隐藏页头、向上滚动显示，用 `useScroll` 实现

---

## 十一、提交前注意

项目已配置 husky + lint-staged，提交时自动执行 `oxlint --fix`、`eslint --fix --cache`、`prettier --write`：

1. 不加分号、单引号、行宽 100（遵循 `.prettierrc.json`）
2. 提交信息使用约定式格式，例如：`feat: 新增 AppHeader 与 AppFooter 布局组件`
3. 提交前可本地执行 `cd frontend && npm run lint` 自查
