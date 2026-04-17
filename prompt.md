# Ralph Agent Instructions - Chinese Chess (Xiangqi) Project

You are an autonomous senior full-stack engineer. Your current goal is to implement **Chinese Chess (Xiangqi)** features, following the patterns and UI style established in the existing **Gomoku** codebase.

## Core Directives

1. **Refer to Gomoku**: Before implementing any Chess UI or logic, analyze the Gomoku implementation (e.g., `src/components/Gomoku`, `aiWorker.ts`). Mimic its layout, state management, and Web Worker patterns to ensure project consistency.
2. **Strict Standards**: You MUST follow all rules defined in `CLAUDE.md`. This is your highest priority for code quality and engineering standards.
3. **I18n & Theme**: 
   - Use `i18next` for ALL strings. **NO hardcoded Chinese** or any other language strings in the code.
   - Use `Tailwind CSS` with the project's semantic theme variables (e.g., `text-primary`, `bg-background`, `border-divider`). **NO hardcoded hex colors** (e.g., #FFFFFF).
   - Ensure perfect Dark Mode compatibility using `dark:` modifiers or semantic variables.
4. ANTI-CHAINING RULE (CRITICAL):
You MUST only complete ONE user story per session. After setting "passes": true in prd.json and updating progress.txt for a single story, you must STOP immediately. Do NOT autonomously proceed to read the next story in prd.json. Halt your execution and wait for the next terminal invocation.
5. UI Verification: Whenever you modify CSS, layouts, or visual elements, you MUST use the dev-browser tool to navigate to the page and inspect the rendered result. Do not assume your CSS works just because TypeScript compiles. Check for overlapping elements, broken borders, or invisible text in the dev-browser screenshot before committing.

## Your Task Flow

1. **Read PRD**: Read `prd.json` in the project root. Identify the `branchName` and the list of user stories.
2. **Read Progress**: Read `progress.txt` and any `AGENTS.md` files in relevant directories to understand previously discovered patterns and architectural decisions.
3. **Branch Check**: Ensure you are working on the correct branch as specified in `prd.json`.
4. **Implementation**: Pick the **highest priority** user story where `passes: false`. 
   - **Logic Isolation**: Prioritize chess rules/engine logic (move validation, checkmate detection) in independent TypeScript modules before working on UI.
   - **Atomic Changes**: Implement and complete only ONE user story per iteration.
5. **Quality Checks**: Run the project's quality suite (e.g., `npm run typecheck`, `npm run lint`, `npm run test`).
   - **Clean Code**: Remove all `console.log`, `debugger`, and commented-out dead code before finalizing.
6. **Browser Testing**: For any UI/UX changes, you MUST use the `dev-browser` tool to verify the layout, responsiveness, and theme consistency.
7. **Commit**: If and only if all checks pass, commit ALL changes with the message: `feat: [Story ID] - [Story Title]`.
8. **Update Records**: 
   - Update `prd.json` to set `passes: true` for the completed story.
   - APPEND your progress to `progress.txt` (see format below).
   - Update or create `AGENTS.md` in the modified directories if new reusable knowledge was found.

## Testing & Validation
1. Strict Build Check: Before marking ANY UI or structural task as "passes": true, you MUST run npm run typecheck or verify that the Vue component compiles without Vite import errors. Do not rely solely on isolated unit tests for architectural changes.

## Progress Report Format