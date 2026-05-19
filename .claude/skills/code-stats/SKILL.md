---
name: code-stats
description: 统计项目代码行数，区分前端和后端，排除依赖文件和生成文件。
allowed-tools: Bash
---

# Code Statistics Skill

## 上下文
- 项目根目录：`d:/code/ai coding`
- 前端项目：`gomoku-web/`
- 后端项目：`gomoku-server/`

## 执行步骤

1. **统计前端代码行数**：在前端目录中，排除 `node_modules`、`dist`、锁文件、生成文件等，按文件类型分类统计行数。

   ```bash
   cd "d:/code/ai coding/gomoku-web" && find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.vue" -o -name "*.js" -o -name "*.jsx" -o -name "*.css" -o -name "*.scss" -o -name "*.html" -o -name "*.json" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/package-lock.json" | while read f; do ext="${f##*.}"; lines=$(wc -l < "$f"); printf "%s %d\n" "$ext" "$lines"; done | awk '{arr[$1]+=$2; total+=$2} END {for(k in arr) printf "  %-8s %6d 行\n", k, arr[k]; printf "  %-8s %6d 行\n", "TOTAL", total}'
   ```

2. **统计后端代码行数**：在后端目录中执行同样的操作。

   ```bash
   cd "d:/code/ai coding/gomoku-server" && find src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.prisma" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/package-lock.json" | while read f; do ext="${f##*.}"; lines=$(wc -l < "$f"); printf "%s %d\n" "$ext" "$lines"; done | awk '{arr[$1]+=$2; total+=$2} END {for(k in arr) printf "  %-8s %6d 行\n", k, arr[k]; printf "  %-8s %6d 行\n", "TOTAL", total}'
   ```

3. **统计配置与根文件行数**（可选，如 prisma schema 等）：

   ```bash
   cd "d:/code/ai coding/gomoku-server" && find prisma -type f \( -name "*.prisma" -o -name "*.sql" \) 2>/dev/null | while read f; do ext="${f##*.}"; lines=$(wc -l < "$f"); printf "%s %d\n" "$ext" "$lines"; done | awk '{arr[$1]+=$2; total+=$2} END {for(k in arr) printf "  %-8s %6d 行\n", k, arr[k]; if(total>0) printf "  %-8s %6d 行\n", "TOTAL", total}'
   ```

4. **汇总输出**：将上述结果整理为如下格式展示给用户：

   ```
   📊 项目代码统计

   ━━━ 前端 (gomoku-web/src) ━━━
     .vue       xxxx 行
     .ts        xxxx 行
     .tsx       xxxx 行
     .css       xxxx 行
     ...
     TOTAL      xxxx 行

   ━━━ 后端 (gomoku-server/src) ━━━
     .ts        xxxx 行
     .js        xxxx 行
     ...
     TOTAL      xxxx 行

   ━━━ 数据库 (gomoku-server/prisma) ━━━
     .prisma    xxxx 行
     ...

   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   项目总计: xxxx 行
   ```

5. **附加统计**（可选，如用户需要）：
   - 各模块/目录的文件数分布
   - 空行和注释行的占比
   - 最近 N 次提交的代码增删趋势

## 注意事项
- 必须排除：`node_modules`、`dist`、`build`、`.next`、`coverage`、`package-lock.json`、`*.log`、`*.min.*`
- 只统计 `src/` 下的源码文件，不统计配置文件（vite.config.ts、tsconfig.json 等）
- 如果用户只关心某一端，可以只运行对应步骤
