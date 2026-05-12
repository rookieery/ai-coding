# AI 系统详解

本项目 AI 系统分为三大模块：**LLM 对弈引擎**、**棋盘视觉识别** 和 **AI 聊天助手**。

---

## 一、LLM 对弈引擎

采用 **启发式筛选 + LLM 决策** 的混合架构。LLM 不直接在全部可能走法中选择，而是先通过启发式算法筛出高质量候选，再由 LLM 从中选择最优走法并给出推理过程。

### 1.1 五子棋 AI

**调用链路**：前端 `gomokuAiApi.move()` → `POST /api/games/gomoku/llm/move` → `LLMAIController` → `LLMAIService` → DeepSeek API

**处理流水线**：

```
1. 威胁检测 (threatDetector.ts)
   └─ 扫描即时获胜 / 对手冲四 / 对手活三
   └─ 若发现关键走法，直接返回，跳过 LLM

2. 候选走法生成 (candidateGenerator.ts)
   └─ 遍历所有空位，模拟落子
   └─ 四方向扫描，识别棋型（五连/活四/冲四/活三/眠三/活二/眠二）
   └─ 综合攻防评分，返回 Top 10 候选

3. LLM 提示词构建 (boardPromptUtils.ts)
   └─ 将棋盘转为 ASCII 网格（A-O 列，1-15 行）
   └─ 构建系统提示：棋盘状态 + 走子历史 + 候选列表 + 策略指导
   └─ 使用中文棋类术语（活四、冲四、活三等）

4. 调用 DeepSeek API (deepseek-chat 模型)

5. 响应验证
   └─ 解析 JSON 响应中的坐标
   └─ 校验坐标合法性 + 候选列表包含性
   └─ 失败时回退到最佳启发式候选
```

**使用的 AI 模型**：DeepSeek `deepseek-chat`

### 1.2 中国象棋 AI

**调用链路**：前端 `chessLlmApi.move()` → `POST /api/games/chinese-chess/llm/move` → `ChessLLMController` → `ChessLLMService` → DeepSeek API

**处理流水线**：

```
1. 威胁检测 (chessThreatDetector.ts)
   ├─ 优先级 1：能否将杀对方
   ├─ 优先级 2：是否被将军（吃子 > 挡将 > 移帅）
   └─ 优先级 3：对手是否有将杀威胁

2. 候选走法生成 (chessCandidateGenerator.ts)
   └─ 生成所有合法走法（7 种棋子完整规则实现）
   └─ 特殊规则：九宫约束、过河限制、蹩马腿、塞象眼、炮翻山、将帅照面
   └─ 按吃子价值 + 将军加分 + 位置价值评分
   └─ 返回 Top 15 候选

3. LLM 提示词构建 (chessBoardPromptUtils.ts)
   └─ 可视化棋盘（中文棋子字符）
   └─ 物质分析（双方剩余棋子）
   └─ 候选列表（中国象棋标准记谱法，如"车九进一"）

4. 调用 DeepSeek API

5. 走法验证
   └─ 候选列表匹配
   └─ 完整合法性验证（不能自杀、不能将帅照面）
```

**棋子编码**：
| 编码 | 红方 | 编码 | 黑方 |
|------|------|------|------|
| 1 | 帅 | 8 | 将 |
| 2 | 仕 | 9 | 士 |
| 3 | 相 | 10 | 象 |
| 4 | 马 | 11 | 马 |
| 5 | 车 | 12 | 车 |
| 6 | 炮 | 13 | 炮 |
| 7 | 兵 | 14 | 卒 |

---

## 二、棋盘视觉识别

### 2.1 统一入口

**服务**：`UnifiedVisionService`

流程：
1. 将用户上传的 base64 图片发送给豆包多模态模型
2. 模型判断棋盘类型（gomoku / chinese_chess）
3. 分发到对应的视觉识别服务

### 2.2 五子棋识别

**服务**：`VisionService`

- 调用豆包视觉模型解析 15x15 棋盘
- 返回 3 个候选矩阵（考虑位置偏移误差）
- 矩阵格式：`'X'`（黑子）、`'O'`（白子）、`'.'`（空位）

### 2.3 中国象棋识别

**服务**：`ChessVisionService`

- 调用豆包视觉模型解析 9x10 棋盘
- 返回 3 个候选矩阵
- 矩阵格式：数字编码（0=空，1-7=红子，8-14=黑子）

### 2.4 流式识别

`/api/vision/recognize/stream` 端点支持 SSE 流式返回：
- `thinking` 事件：AI 思考过程
- `answer` 事件：识别结果文本
- `board_data` 事件：解析后的棋盘矩阵 JSON

---

## 三、AI 聊天助手

### 3.1 聊天服务

**服务**：`ChatService`

- 使用 OpenAI SDK 调用 DeepSeek `deepseek-reasoner` 模型
- System Prompt 定位：棋类专家（五子棋 + 象棋）
- 支持流式和非流式两种模式

### 3.2 流式响应格式

```
事件类型:
  thinking  → AI 推理过程（reasoning_content）
  answer    → 正式回答内容

终止标记: [DONE]
```

### 3.3 前端打字机效果

`useTypewriterQueue` composable 实现：
- 缓冲文本块，按可配置速度逐字渲染
- 缓冲区增长时自动加速
- 支持思考内容和回答内容两条并行队列

### 3.4 多模态交互

聊天助手集成了图片识别能力：
- 用户上传棋盘照片 → 视觉识别 → 在聊天中展示候选
- 用户确认后可在右侧面板复盘或分析
- 用户文字描述落子（坐标/记谱法）→ 自动在右侧面板执行

---

## 四、第三方 AI 服务

| 服务 | 用途 | 模型 | SDK |
|------|------|------|-----|
| DeepSeek | 五子棋 AI 走子 | `deepseek-chat` | 直接 REST API |
| DeepSeek | 象棋 AI 走子 | `deepseek-chat` | 直接 REST API |
| DeepSeek | 聊天对话 | `deepseek-reasoner` | OpenAI SDK |
| 豆包 (Doubao) | 棋盘类型检测 | 多模态视觉 | OpenAI SDK |
| 豆包 (Doubao) | 五子棋盘识别 | 多模态视觉 | OpenAI SDK |
| 豆包 (Doubao) | 象棋棋盘识别 | 多模态视觉 | OpenAI SDK |

---

## 五、前端内置 AI

除后端 LLM AI 外，前端还内置了完整的五子棋 AI 引擎：

| 难度 | 实现方式 | 文件位置 |
|------|---------|---------|
| 入门 | 启发式 Top-5 随机 | `games/gomoku/utils/ai.ts` |
| 中级 | 启发式最优 | `games/gomoku/utils/ai.ts` |
| 高级 | Minimax (depth 8) | `games/gomoku/utils/minimaxAI.ts` |
| 专家 | PVS + 迭代加深 + VCF (depth 12-14) | `games/gomoku/utils/expertAI.ts` |
| 神经网络 | TensorFlow.js 模型推理 | `games/gomoku/utils/neuralAI.ts` |

象棋也有前端 Web Worker AI：`games/chinese-chess/utils/chessWorker.ts`
