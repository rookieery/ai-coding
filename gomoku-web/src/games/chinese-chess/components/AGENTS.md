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