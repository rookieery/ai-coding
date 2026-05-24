#!/usr/bin/env node

/**
 * verify-api.mjs — Claude Code PostToolUse Hook
 *
 * 当 AI 编写或编辑 API 相关文件时，自动提取端点信息并校验连通性。
 * 纯 Node.js 零依赖，项目无关，通过 api-test-config.json 配置。
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import https from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 配置加载 ────────────────────────────────────────────────────────────────

function loadConfig() {
  const configPath = join(__dirname, 'api-test-config.json');
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  } catch {
    return {
      baseUrl: 'http://localhost:3003/api',
      healthEndpoint: 'http://localhost:3003/health',
      healthTimeout: 3000,
      requestTimeout: 5000,
      filePatterns: {
        frontend: ['src/api/', '/api-', 'ApiService'],
        backend: ['src/routes/', '/routes/', '.routes.'],
      },
      authToken: '',
    };
  }
}

// ── stdin 读取 ──────────────────────────────────────────────────────────────

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', () => resolve(''));
  });
}

// ── 文件类型判断 ────────────────────────────────────────────────────────────

function isApiFile(filePath, patterns) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/');
  const allPatterns = [...(patterns.frontend || []), ...(patterns.backend || [])];
  return allPatterns.some((p) => normalized.includes(p));
}

function detectSide(filePath, patterns) {
  const normalized = filePath.replace(/\\/g, '/');
  if ((patterns.frontend || []).some((p) => normalized.includes(p))) return 'frontend';
  if ((patterns.backend || []).some((p) => normalized.includes(p))) return 'backend';
  return 'unknown';
}

// ── 端点提取 ────────────────────────────────────────────────────────────────

function extractEndpoints(content, side, filePath, config) {
  const endpoints = [];

  if (side === 'frontend') {
    extractFrontendEndpoints(content, endpoints);
  } else if (side === 'backend') {
    extractBackendEndpoints(content, endpoints, filePath, config);
  }

  return deduplicateEndpoints(endpoints);
}

function extractFrontendEndpoints(content, endpoints) {
  // 匹配 getApiUrl('/path') — 单引号/双引号
  const apiUrlStatic = /getApiUrl\s*\(\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = apiUrlStatic.exec(content)) !== null) {
    const path = match[1].split('?')[0];
    if (!path) continue;
    const method = inferMethodFromContext(content, match.index);
    endpoints.push({ path, method, source: 'frontend' });
  }

  // 匹配 getApiUrl(`/path?${...}`) 或 getApiUrl(`/path/${var}`) — 模板字符串
  const apiUrlTemplate = /getApiUrl\s*\(\s*`([^`]+)`/g;
  while ((match = apiUrlTemplate.exec(content)) !== null) {
    let tmpl = match[1];
    // 去掉 ${...} 插值，保留静态路径骨架
    tmpl = tmpl.replace(/\$\{[^}]*\}/g, '');
    // 去掉查询参数
    tmpl = tmpl.split('?')[0];
    // 去掉尾部斜杠和空段
    tmpl = tmpl.replace(/\/+$/, '');
    if (!tmpl || tmpl === '/') continue;
    const method = inferMethodFromContext(content, match.index);
    endpoints.push({ path: tmpl, method, source: 'frontend' });
  }

  // 匹配 fetch(`${baseUrl}/path`, ...)
  const fetchRegex = /fetch\s*\(\s*[`'"](?:\$\{[^}]*\})?([^'"`\s,)]+)[`'"]/g;
  while ((match = fetchRegex.exec(content)) !== null) {
    let url = match[1];
    if (!url || url.includes('${')) continue;
    url = url.split('?')[0];
    const path = extractPath(url);
    if (!path) continue;
    const method = inferMethodFromContext(content, match.index);
    endpoints.push({ path, method, source: 'frontend' });
  }
}

function extractBackendEndpoints(content, endpoints, filePath, config) {
  // 从文件名推断路由键名: room.routes.ts → "room"
  const fileName = filePath.replace(/\\/g, '/').split('/').pop() || '';
  const prefixMatch = fileName.match(/^(?:\w+\.)?([\w-]+)\.(?:routes|router)/);
  const routeKey = prefixMatch ? prefixMatch[1].replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() : '';

  // 优先使用配置映射，否则用文件名作为前缀
  const routePrefix = (config.routePrefixMap && config.routePrefixMap[routeKey])
    ? config.routePrefixMap[routeKey]
    : (routeKey ? `/${routeKey}` : '');

  const routeRegex = /(?:router|app)\s*\.\s*(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]*)['"`]/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let path = match[2];
    if (!path && path !== '/') continue;

    // 路径参数占位符替换为测试值: :id → 1
    path = path.replace(/:([a-zA-Z_]+)/g, '1');

    // 组合完整路径: 前缀 + 相对路径
    if (routePrefix && (path === '/' || path === '')) {
      path = routePrefix;
    } else if (routePrefix) {
      path = routePrefix + path;
    }

    endpoints.push({ path, method, source: 'backend' });
  }
}

function inferMethodFromContext(content, fetchIndex) {
  // 在 fetch 调用周围搜索 method 字段（主要在 fetch options 中，位于 URL 之后）
  const around = content.slice(fetchIndex, Math.min(content.length, fetchIndex + 300));
  const methodMatch = around.match(/method\s*:\s*['"`](GET|POST|PUT|DELETE|PATCH)['"`]/i);
  if (methodMatch) return methodMatch[1].toUpperCase();
  // 有 body 时推断为 POST
  if (around.match(/body\s*:/)) return 'POST';
  return 'GET';
}

function extractPath(url) {
  // 从完整 URL 中提取路径: http://host:port/api/path → /api/path
  try {
    if (url.startsWith('http')) {
      const parsed = new URL(url);
      return parsed.pathname;
    }
    if (url.startsWith('/')) return url;
    if (url.startsWith('/api')) return url;
    return null;
  } catch {
    return null;
  }
}

function deduplicateEndpoints(endpoints) {
  const seen = new Set();
  return endpoints.filter((ep) => {
    // 跳过健康检查等非 API 路径
    if (ep.path === '/health' || ep.path === '/healthz') return false;
    const key = `${ep.method} ${ep.path}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ── HTTP 请求 ───────────────────────────────────────────────────────────────

function httpGet(url, timeout, token) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const headers = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const req = mod.get(url, { headers, timeout }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
  });
}

function httpMethod(method, url, timeout, token, body) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === 'https:' ? https : http;
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const bodyStr = body ? JSON.stringify(body) : undefined;

    const options = { method, headers, hostname: parsed.hostname, port: parsed.port, path: parsed.pathname + parsed.search, timeout };

    const req = mod.request(options, (res) => {
      let resBody = '';
      res.on('data', (chunk) => (resBody += chunk));
      res.on('end', () => {
        resolve({ status: res.statusCode, headers: res.headers, body: resBody });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: err.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── 校验逻辑 ────────────────────────────────────────────────────────────────

async function checkBackendHealth(config) {
  const res = await httpGet(config.healthEndpoint, config.healthTimeout, config.authToken);
  return res.status > 0 && res.status < 500;
}

async function verifyEndpoint(endpoint, config) {
  const { path, method } = endpoint;

  // 构建完整 URL
  let fullUrl;
  if (path.startsWith('http')) {
    fullUrl = path;
  } else {
    const base = config.baseUrl.replace(/\/$/, '');
    const ep = path.startsWith('/') ? path : `/${path}`;
    fullUrl = `${base}${ep}`;
  }

  let res;
  const timeout = config.requestTimeout;

  switch (method) {
    case 'GET':
      res = await httpGet(fullUrl, timeout, config.authToken);
      break;
    case 'POST':
    case 'PUT':
    case 'PATCH':
      res = await httpMethod(method, fullUrl, timeout, config.authToken, {});
      break;
    case 'DELETE':
      res = await httpMethod('DELETE', fullUrl, timeout, config.authToken);
      break;
    default:
      res = await httpGet(fullUrl, timeout, config.authToken);
  }

  // 评判结果
  const result = { url: fullUrl, method, status: res.status, passed: false, reason: '' };

  if (res.status === 0) {
    result.reason = res.error === 'timeout' ? '请求超时' : `连接失败: ${res.error}`;
    return result;
  }

  if (res.status === 404) {
    // 区分"路由不存在"和"资源不存在"
    try {
      const json = JSON.parse(res.body);
      if (typeof json.success === 'boolean') {
        // 有 ApiResponse 格式 → 端点存在，只是资源未找到
        result.passed = true;
        result.reason = '404 资源未找到（端点存在）';
        return result;
      }
    } catch { /* ignore */ }
    result.reason = '端点不存在 (404)，请检查 URL 路径和后端路由是否匹配';
    return result;
  }

  if (res.status === 405) {
    result.reason = `HTTP Method 不匹配 (405)，后端不支持 ${method} 方法`;
    return result;
  }

  if (res.status >= 500) {
    result.reason = `服务端错误 (${res.status})，后端接口异常`;
    return result;
  }

  // 2xx / 3xx / 400 / 401 / 403 都算"端点存在"
  result.passed = true;

  if (res.status === 400) {
    result.reason = '端点存在但参数校验失败 (400)，端点可达';
  } else if (res.status === 401) {
    result.reason = '端点存在但需要认证 (401)，端点可达';
  } else if (res.status >= 200 && res.status < 300) {
    // 检查响应是否为合法 JSON
    try {
      const json = JSON.parse(res.body);
      if (typeof json.success !== 'undefined') {
        result.reason = `${res.status} OK (ApiResponse 格式)`;
      } else {
        result.reason = `${res.status} OK`;
      }
    } catch {
      result.reason = `${res.status} OK (非 JSON 响应)`;
    }
  } else {
    result.reason = `${res.status}`;
  }

  return result;
}

// ── 输出报告 ────────────────────────────────────────────────────────────────

function reportResults(filePath, results) {
  const fileName = filePath.replace(/\\/g, '/').split('/').pop();
  const lines = [`[API Verify] 检测到 API 文件变更: ${fileName}`];

  const failed = results.filter((r) => !r.passed);
  const passed = results.filter((r) => r.passed);

  for (const r of passed) {
    lines.push(`  ✓ ${r.method} ${r.url} → ${r.reason}`);
  }
  for (const r of failed) {
    lines.push(`  ✗ ${r.method} ${r.url} → ${r.reason}`);
  }

  if (failed.length > 0) {
    lines.push('');
    lines.push(`共 ${results.length} 个端点，${failed.length} 个校验失败。`);
    lines.push('请检查前后端接口是否一致（URL 路径、HTTP Method、请求参数字段名）。');
  } else {
    lines.push(`共 ${results.length} 个端点，全部通过校验。`);
  }

  return { text: lines.join('\n'), hasFailures: failed.length > 0 };
}

// ── 主入口 ──────────────────────────────────────────────────────────────────

async function main() {
  const config = loadConfig();

  // 读取 hook 输入
  const stdinData = await readStdin();
  if (!stdinData) process.exit(0);

  let hookData;
  try {
    hookData = JSON.parse(stdinData);
  } catch {
    process.exit(0);
  }

  const filePath = hookData.tool_input?.file_path || '';
  if (!filePath) process.exit(0);

  // 跳过非业务文件
  if (filePath.includes('node_modules') || filePath.includes('.d.ts') || filePath.includes('dist/')) {
    process.exit(0);
  }

  // 判断是否为 API 文件
  if (!isApiFile(filePath, config.filePatterns)) {
    process.exit(0);
  }

  const side = detectSide(filePath, config.filePatterns);

  // 读取文件内容
  let content = hookData.tool_input?.content || '';
  if (!content) {
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      process.exit(0);
    }
  }

  // 提取端点
  const endpoints = extractEndpoints(content, side, filePath, config);
  if (endpoints.length === 0) {
    process.exit(0);
  }

  // 检查后端是否在运行
  const backendRunning = await checkBackendHealth(config);
  if (!backendRunning) {
    // 后端未运行，不阻断开发
    process.exit(0);
  }

  // 逐个校验端点
  const results = [];
  for (const endpoint of endpoints) {
    const result = await verifyEndpoint(endpoint, config);
    results.push(result);
  }

  // 输出报告
  const report = reportResults(filePath, results);
  if (report.hasFailures) {
    process.stderr.write(report.text + '\n');
    process.exit(2);
  } else {
    // 通过时静默输出（stdout 会显示给 Claude）
    console.log(report.text);
    process.exit(0);
  }
}

main().catch(() => process.exit(0));
