# Chinese Chess UI Components

## Component Migration (S30b2)

As part of the modularization effort, Chinese Chess UI components have been migrated from `src/components/chinese-chess/` to `src/games/chinese-chess/components/` to align with the project's game module architecture.

### Migrated Components

1. **Board.vue** - Main game board with coordinate display, piece rendering, and interaction logic
2. **GameControls.vue** - Game mode selection, AI settings, and action buttons
3. **HistoryPanel.vue** - Move history display with notation and copy functionality

### Import Path Updates

All import paths have been updated to reflect the new structure:
- Types and game logic: `../types`, `../gameLogic`, etc.
- i18n: `../../../i18n` (relative to component location)
- Router updated to use `../games/chinese-chess/views/ChineseChessView.vue`

### Design Patterns

Following the established Gomoku patterns:
- Vue 3 Composition API with TypeScript
- Tailwind CSS for styling with semantic theme variables
- i18n for all text localization
- Event-driven component communication

### Notes for Future Development

- All new UI components for Chinese Chess should be placed in this directory
- Follow the same import path patterns (relative to game module root)
- Ensure dark mode compatibility using `currentTheme` from i18n
- Use semantic color classes from Tailwind theme config

### Bug Fixes & Safety Patterns

**Array method safety**: When calling `.some`, `.map`, `.filter` on reactive arrays that may be undefined or null, always use optional chaining (`?.`) and provide a default fallback (`?? []`). Example:

```ts
const isLegal = validMoves.value?.some(m => m.col === col && m.row === row) ?? false;
```

**Prop validation**: For optional array props, verify the prop is indeed an array before using it, as Vue may pass `null` or `undefined`. Use `Array.isArray(props.validMoves)`.

**Selected piece highlighting**: Add visual feedback beyond a ring—consider a slight scale transformation (`scale-105`) to make the selected piece more prominent.

**Breathing dot animation**: Use CSS keyframes with opacity range 0.3–0.8 and a smooth easing function for a “breathing” effect.

**Legal target hints for capture**: When a legal target square contains an opponent's piece, the hint should still be visible. Add a conditional overlay (e.g., red border or crosshair icon) inside the piece element, since the green breathing dot is only rendered for empty squares. Use a method `isLegalTarget` to check if the coordinate is in `legalTargets` and display a red border with `animate-pulse`.

## Theme Integration (Feature-Theme-5)

Chinese Chess board now fully supports the project's theme system (`src/common/theme.ts`). The `Board.vue` component accepts a `theme` prop (of type `ThemeKey`) and dynamically applies theme colors to:

- **Board background & borders**: Uses `boardBackground` and `lineColor` from the selected theme.
- **Coordinate labels**: Uses `textPrimary` for column/row numbers.
- **Cell alternating background**: Uses `boardBackground` and `lineBackground` for checkered pattern.
- **River (Chu/Han) boundaries**: Uses `lineColor` for dashed borders and text.
- **Piece colors**: Red pieces use `piecePrimary`, black pieces use `pieceSecondary`.
- **Thinking path markers**: Semi‑transparent versions of `piecePrimary`/`pieceSecondary` with `bg-opacity-20`.
- **Hover indicators**: Semi‑transparent versions of the current player's piece color.

### Implementation Notes

- The `themeColors` computed property fetches the color‑class mapping via `getThemeColors(themeKey)`.
- All hard‑coded amber (`amber-*`) classes have been replaced with dynamic `:class` bindings.
- The `pieceColorClass` helper now returns `themeColors.piecePrimary`/`pieceSecondary` instead of fixed red/stone colors.
- Theme switching is seamless—the board re‑renders with the new color classes without any flicker or layout shift.
- Existing visual features (breathing dots for legal targets, red borders for capture hints, selected‑piece rings) remain fully functional.

### Usage

Pass the `theme` prop from the parent view (e.g., `ChineseChessView.vue`), which typically reads `settings.chessTheme` from the `useSettings` composable. The `GameControls` component already includes a `ThemeSelector` that emits `updateTheme` events.

### Future Theme Extensions

- Consider adding theme‑specific river‑text characters (e.g., different calligraphy for "楚河"/"汉界").
- Allow themes to define custom piece Unicode characters (e.g., different font families for cyber/minimal themes).
- Add theme‑aware sound effects or animations (e.g., piece‑move sounds that match the theme's aesthetic).

## Bug Fix: Theme Prop Type Mismatch (Bugfix-Theme-Render)

**Problem**: The board component received a `Ref<ThemeKey>` object instead of a plain `ThemeKey` string, causing Vue prop type warnings and a white‑screen crash (`Cannot read properties of undefined (reading "boardBackground")`).

**Root cause**: The `useSettings().chessTheme` is a `Ref<ThemeKey>`. When passed directly via `:theme="settings.chessTheme"` in the template, Vue does **not** automatically unwrap a ref that is nested inside a plain object (`settings` is not a reactive object, just a plain object holding a ref). The ref object was passed as‑is, triggering the prop type error.

**Solution**: 
1. **Unwrap the ref in the parent view**: Create a computed property `const theme = computed(() => settings.chessTheme.value)` and bind `:theme="theme"` instead.
2. **Defensive fallback in `getThemeColors()`**: Ensure the function returns the default theme when an invalid key is supplied (prevents `undefined` access).
3. **No changes needed in the board component** – it already handles `undefined` theme by falling back to `'default'`.

**Prevention**: When passing a ref as a prop, always unwrap it first unless the child component explicitly expects a ref. Use a computed property or `toRef()` with `toValue()` if the value might be a ref, a computed, or a plain value.

**Files changed**:
- `src/games/chinese‑chess/views/ChineseChessView.vue` – added computed `theme`
- `src/common/theme.ts` – added fallback to default theme in `getThemeColors()`

**Testing**: Run `npm run lint` to verify no TypeScript errors; visually confirm the board renders with the selected theme.

## Visual Bug Fix: Piece Text Color and Grid Line Contrast (UI-Fix-Piece-Color, UI-Fix-Grid-Lines)

**Problem**: 
1. Piece text colors were incorrectly reversed in dark mode, making red/black pieces unreadable.
2. Grid lines (including river boundaries) had insufficient contrast, making them nearly invisible.

**Solution**:
1. **Piece text colors**: Removed `dark:` responsive variants from `pieceTextPrimary` and `pieceTextSecondary` in all themes, forcing fixed colors regardless of dark/light mode. Red pieces now use `text-red-600` (default), `text-[#8B0000]` (zen), `text-[#F43F5E]` (cyber), `text-[#EF4444]` (minimal). Black pieces use `text-gray-900` (default, minimal), `text-[#1A1A1A]` (zen), `text-[#2DD4BF]` (cyber). Cyber theme retains its fluorescent colors with drop shadows.
2. **Grid line contrast**: Updated `lineColor` and `lineBackground` for each theme to high‑contrast solid colors:
   - Default & Zen: `border-[#5C4033]` (deep brown)
   - Cyber: `border-[#06B6D4]` (bright cyan) with no opacity
   - Minimal: `border-[#9CA3AF]` (medium gray)
   Removed opacity/transparency to ensure lines are clearly visible.

**Implementation**:
- Modified `src/common/theme.ts` only; no component changes required.
- All theme colors now apply consistently across light/dark modes.

**Verification**:
- Run `npm run lint` to ensure no TypeScript errors.
- Visually inspect board grid lines and piece text colors in all four themes.