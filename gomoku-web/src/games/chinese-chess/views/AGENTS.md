# Chinese Chess View

## View Migration (S30b2)

The main Chinese Chess view has been migrated from `src/views/ChineseChessView.vue` to `src/games/chinese-chess/views/ChineseChessView.vue` as part of the modularization effort.

### Changes Made

1. **File Location** - Moved to game-specific module directory
2. **Import Path Updates** - All imports updated to reflect new structure:
   - Game logic imports: `../types`, `../gameLogic`, `../boardState`
   - Component imports: `../components/Board.vue`, `../components/GameControls.vue`, `../components/HistoryPanel.vue`
   - i18n import: `../../../i18n`
   - API and composable imports: `../../../api/game-api`, `../../../composables/useAuth`
3. **AI Worker Path** - Updated from `../chinese-chess/ai/aiWorker.ts` to `../ai/aiWorker.ts`
4. **Router Update** - Router configuration updated to use new path

### View Architecture

The ChineseChessView.vue is the main container component that:
- Manages game state (board, current player, winner, mode)
- Handles AI integration via Web Worker
- Coordinates between Board, GameControls, and HistoryPanel components
- Provides game save/load functionality
- Implements game logic and move validation

### Key Dependencies

- **Game Logic**: `../gameLogic.ts` for move validation and game state evaluation
- **Board State**: `../boardState.ts` for board manipulation and piece management
- **AI Worker**: `../ai/aiWorker.ts` for background AI calculations
- **Notation**: `../notation.ts` for move history display
- **Components**: All UI components from `../components/`

### Integration Points

- **Router**: Registered at `/chinese-chess` route with authentication requirement
- **API**: Communicates with backend via `gameApi` for game persistence
- **i18n**: Uses translation functions for all user-facing text
- **Auth**: Uses `useGlobalAuth` composable for user authentication and permissions

### Notes for Future Development

- Keep this view focused on orchestration, not business logic
- Business logic should remain in the game logic layer (`../gameLogic.ts`)
- New features should be added to appropriate layers (UI components, game logic, or services)
- Follow the established patterns for state management and component communication