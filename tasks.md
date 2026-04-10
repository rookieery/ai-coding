# 中国象棋功能开发任务清单

遵循 Ralph 工具包规范，每个任务代码量控制在 100 行左右。

## 项目分析阶段
- [x] 分析现有五子棋项目结构，确定可复用的组件和模式
  - 文件：`gomoku-web/src/` 目录下的 gameLogic.ts、aiWorker.ts、components/
  - 发现：游戏逻辑与 UI 分离，使用 Web Worker 进行 AI 计算，i18n 国际化支持
  - 复用建议：复用 Board.vue 的棋盘渲染逻辑，复用 GameView.vue 的状态管理框架

## 类型定义与基础架构
- [ ] 创建中国象棋类型定义文件 (types.ts)
  - 文件：`gomoku-web/src/chinese-chess/types.ts`
  - 内容：棋子类型枚举、棋盘坐标、游戏状态、移动历史等接口定义
  - 预估代码：约 80 行

- [ ] 实现棋盘初始化和状态管理 (boardState.ts)
  - 文件：`gomoku-web/src/chinese-chess/boardState.ts`
  - 内容：初始化标准棋盘、棋子位置、当前回合、游戏状态管理
  - 预估代码：约 100 行

## 规则引擎实现（分棋子）
- [ ] 实现车（Rook）的移动规则验证
  - 文件：`gomoku-web/src/chinese-chess/rules/rook.ts`
  - 内容：直线移动，不能越过其他棋子
  - 预估代码：约 60 行

- [ ] 实现马（Knight）的移动规则验证（包括蹩马腿）
  - 文件：`gomoku-web/src/chinese-chess/rules/knight.ts`
  - 内容：日字移动，检查绊马腿（马腿位置是否有棋子）
  - 预估代码：约 70 行

- [ ] 实现炮（Cannon）的移动规则验证（包括隔山打）
  - 文件：`gomoku-web/src/chinese-chess/rules/cannon.ts`
  - 内容：直线移动，吃子时必须隔一个棋子（炮架）
  - 预估代码：约 70 行

- [ ] 实现兵（Pawn）的移动规则验证（包括过河横走）
  - 文件：`gomoku-web/src/chinese-chess/rules/pawn.ts`
  - 内容：过河前只能向前，过河后可左右移动，不能后退
  - 预估代码：约 60 行

- [ ] 实现士（Advisor）和象（Elephant）的移动规则验证
  - 文件：`gomoku-web/src/chinese-chess/rules/advisor-elephant.ts`
  - 内容：士：斜线移动（九宫格内）；象：田字移动，不能过河，塞象眼
  - 预估代码：约 80 行

- [ ] 实现将（King）的移动规则验证（包括将帅不能照面）
  - 文件：`gomoku-web/src/chinese-chess/rules/king.ts`
  - 内容：九宫格内移动，将帅不能直接照面（中间无棋子）
  - 预估代码：约 70 行

## 高级规则与游戏逻辑
- [ ] 实现将军检测逻辑
  - 文件：`gomoku-web/src/chinese-chess/rules/check.ts`
  - 内容：检查当前玩家是否被将军（将/帅受到攻击）
  - 预估代码：约 90 行

- [ ] 实现将死检测逻辑
  - 文件：`gomoku-web/src/chinese-chess/rules/checkmate.ts`
  - 内容：检查当前玩家是否无合法移动（将死）
  - 预估代码：约 100 行

- [ ] 创建游戏逻辑主文件 (gameLogic.ts)，集成所有规则
  - 文件：`gomoku-web/src/chinese-chess/gameLogic.ts`
  - 内容：导出主要函数（移动验证、将军检测、胜负判定等）
  - 预估代码：约 100 行

## 测试驱动开发（TDD）
- [ ] 编写单元测试框架配置（Jest/Vitest）
  - 文件：`gomoku-web/vitest.config.ts` 或扩展现有配置
  - 内容：配置测试环境，支持 TypeScript
  - 预估代码：约 40 行

- [ ] 为每种棋子规则编写单元测试
  - 文件：`gomoku-web/src/chinese-chess/rules/__tests__/`
  - 内容：分别为车、马、炮、兵、士、象、将编写测试用例
  - 预估代码：每个测试文件约 50-70 行，总计约 350 行

- [ ] 为将军和将死检测编写单元测试
  - 文件：`gomoku-web/src/chinese-chess/rules/__tests__/check.test.ts`
  - 内容：测试将军和将死检测的各种场景
  - 预估代码：约 100 行

## AI 算法与 Web Worker
- [ ] 创建中国象棋 AI 基础框架（简单的 minimax 算法）
  - 文件：`gomoku-web/src/chinese-chess/ai/minimax.ts`
  - 内容：实现基本的 minimax 搜索，评估函数（棋子价值、位置）
  - 预估代码：约 100 行

- [ ] 将 AI 算法迁移到 Web Worker (aiWorker.ts)
  - 文件：`gomoku-web/src/chinese-chess/ai/aiWorker.ts`
  - 内容：创建 Worker，接收棋盘状态，返回最佳移动
  - 预估代码：约 80 行

## UI 组件复用与开发
- [ ] 创建中国象棋棋盘 UI 组件 (Board.vue)，复用现有样式
  - 文件：`gomoku-web/src/components/chinese-chess/Board.vue`
  - 内容：渲染 9x10 棋盘，显示棋子（汉字或图标），处理点击事件
  - 预估代码：约 150 行（可复用现有 Board.vue 的 70%）

- [ ] 创建中国象棋游戏控制组件 (GameControls.vue)
  - 文件：`gomoku-web/src/components/chinese-chess/GameControls.vue`
  - 内容：游戏模式选择、难度设置、悔棋、重新开始等
  - 预估代码：约 120 行（复用现有 GameControls.vue）

- [ ] 创建中国象棋主视图 (ChineseChessView.vue)
  - 文件：`gomoku-web/src/views/ChineseChessView.vue`
  - 内容：整合棋盘、控制面板、状态显示，管理游戏状态
  - 预估代码：约 200 行（复用 GameView.vue 的结构）

## 国际化与集成
- [ ] 在 i18n 中添加中国象棋翻译键
  - 文件：`gomoku-web/src/i18n.ts`
  - 内容：添加标题、棋子名称、游戏状态等翻译
  - 预估代码：约 50 行（每个语言添加对应键值）

- [ ] 集成到现有路由和导航
  - 文件：`gomoku-web/src/router/index.ts`
  - 内容：添加中国象棋路由，更新导航菜单
  - 预估代码：约 30 行

## 测试与验证
- [ ] 进行端到端测试和 UI 验证
  - 内容：手动测试游戏流程，AI 对战，规则正确性
  - 无需新代码，但需要验证各组件集成

## 总计
- 任务数量：24 个
- 预估总代码量：约 2000 行
- 每个任务平均代码量：约 83 行

## 注意事项
1. 遵循现有项目的代码风格和架构模式
2. 严格使用 TypeScript，避免 any 类型
3. 所有用户界面文本必须使用 i18n 翻译
4. 保持组件单一职责，超过 250 行时考虑拆分
5. AI 算法优先实现基础版本，后续可优化性能