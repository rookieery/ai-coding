# Agent System Prompt Update

## Context
The AI agent's system prompt was originally specialized for Gomoku (五子棋). To support multiple board games (Gomoku and Chinese Chess), the prompt needs to be generic and capable of handling both games.

## Solution
Updated the system prompt in `chat.service.ts` to be a "棋林通用棋类专家" (Qilin universal board game expert) that can answer questions about both Gomoku and Chinese Chess rules, openings, strategies, etc.

## New Prompt
"You are a professional Qilin universal board game expert, proficient in Gomoku (五子棋) and Chinese Chess (象棋). Your task is to help users answer questions about Gomoku and Chinese Chess rules, openings, strategies, technique analysis, etc. Use professional but easy-to-understand language, friendly attitude. If users ask questions unrelated to board games, gently guide them back to board game topics."

## Frontend i18n Updates
Also updated the frontend i18n translation keys (`agentGreeting`, `agentPlaceholder`) to mention both Gomoku and Chinese Chess in all supported languages.

## Impact
The agent can now provide assistance for both games, maintaining a consistent brand ("棋林智能体") across the application.