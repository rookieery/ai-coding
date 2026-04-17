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

## Visual Bug Fix: Board Boundary Clarity and Piece Text Color Enforcement (UI-Fix-Piece-Contrast, UI-Fix-Board-Boundary)

**Problem**:
1. Board boundary had decorative blur/shadow effects (`shadow-2xl`) that reduced clarity.
2. Grid lines (horizontal/vertical) were too thin (1px) with insufficient contrast.
3. Piece text colors could still be affected by dark mode inversion in some scenarios.

**Solution**:
1. **Board boundary**: Removed `shadow-2xl` from the board container, replaced with a crisp solid border (`border-4`). This eliminates blurry decorative effects.
2. **Grid line thickness**: Increased all grid lines from 1px to 2px:
   - Horizontal lines (`h-[1px]` → `h-[2px]`)
   - Vertical lines (`w-[1px]` → `w-[2px]`)
   - Palace diagonal lines (`h-[1px]` → `h-[2px]`)
3. **River text visibility**: Increased opacity from 30% to 70% for "楚河"/"汉界" labels.
4. **Piece text color enforcement**: Standardized piece text colors across themes:
   - Default, Zen, Minimal: Red pieces use `text-red-600`, black pieces use `text-gray-900`
   - Cyber theme: Red pieces keep `text-[#F43F5E]`, black pieces changed to `text-blue-600` (maintains red/blue distinction while improving readability)
   - Removed any potential dark mode inversion by ensuring no `dark:` variants on piece text colors.

**Implementation**:
- Modified `src/games/chinese-chess/components/Board.vue`:
  - Removed `shadow-2xl`, increased border width
  - Increased grid line thickness
  - Increased river text opacity
- Modified `src/common/theme.ts`:
  - Standardized piece text colors across themes
  - Cyber theme black pieces changed from cyan (`text-[#2DD4BF]`) to blue (`text-blue-600`) for better contrast

**Verification**:
- Run `npm run lint` and `npm run build` to ensure no TypeScript or compilation errors.
- Visually inspect board boundaries (should be crisp solid lines without blur).
- Check grid lines are clearly visible (2px thick).
- Verify piece text colors remain consistent in both light and dark modes.

## Board Grid Architecture Refactoring (UI-Refactor-Board-Grid)

**Problem**: The original board grid used nested divs to draw lines within each cell, causing misalignment at intersections and inability to properly break vertical lines at the river (Chu/Han boundary). This approach also mixed grid rendering with piece rendering, making the code difficult to maintain.

**Solution**: 
1. **SVG background layer**: Created an absolute‑positioned SVG container that draws the entire grid as a single unit.
2. **Separated concerns**: 
   - Grid lines (9 vertical, 10 horizontal) drawn with SVG `<path>` elements
   - Vertical lines intentionally broken between rows 4–5 (river region)
   - Palace diagonals drawn as separate SVG paths
   - River text placed as absolute‑positioned divs centered in the river area
   - Piece layer remains as a CSS Grid overlay, completely independent of the grid lines
3. **Clean coordinate system**: SVG uses `viewBox="0 0 9 10"` where each unit corresponds to one cell, ensuring perfect alignment regardless of responsive sizing.

**Implementation**:
- Added computed properties `gridLines` and `palaceDiagonals` that generate SVG path data.
- Removed all inline‑cell border divs (`h‑[2px]`, `w‑[2px]`) and palace‑diagonal clip‑path hacks.
- Removed cell background color (`themeColors.boardBackground`) from individual cells, allowing the outer container’s background to show through.
- SVG lines use `stroke‑width="0.03"` (relative to viewBox) and inherit `themeColors.lineBackground` for consistent theming.

**Benefits**:
- Perfectly aligned intersections and consistent line thickness.
- Clear separation between visual layers (grid vs. pieces).
- Simplified CSS – no more complex positioning calculations per cell.
- Maintains full theme support; grid lines automatically adopt the current theme's `lineBackground` color.
- Fully responsive; the SVG scales with the grid container.

**Verification**:
- Run `npm run lint` and `npm run build` to confirm no TypeScript errors.
- Visually inspect that all vertical lines are broken between rows 4 and 5 (river).
- Confirm that palace diagonals appear only in the correct 3×3 palace regions.
- Ensure pieces render above the grid lines and remain interactive.
- Test across all four themes to verify grid lines adapt correctly.