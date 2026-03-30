/// <reference types="vite/client" />

// Vite环境变量类型声明
interface ImportMetaEnv {
  readonly VITE_GOMOKU_MODEL_URL?: string
  // 可以添加其他环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
