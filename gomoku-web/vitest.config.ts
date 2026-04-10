import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // 测试环境（默认为 node，如需 DOM 测试可改为 'jsdom'）
    environment: 'node',
    // 包含的测试文件 glob 模式
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    // 排除的目录
    exclude: ['node_modules', 'dist', '**/node_modules/**'],
    // 全局配置（不启用，推荐使用 import { describe, it, expect } from 'vitest'）
    globals: false,
    // 覆盖率配置
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/types.ts',
        '**/index.ts',
      ],
    },
    // 设置超时时间（毫秒）
    testTimeout: 10000,
    // 每个测试文件的钩子超时
    hookTimeout: 10000,
    // 是否在测试期间显示控制台输出
    silent: false,
    // 测试报告器
    reporters: ['verbose'],
    // 配置 TypeScript 支持
    typecheck: {
      enabled: false, // 如需类型检查测试可设为 true，但会显著降低速度
    },
  },
});