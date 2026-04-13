# Modular Routing Structure for Multi-Game Support

## Overview
The backend now supports modular routing for different game types (Gomoku, Chinese Chess). Each game has its own route file under `src/routes/games/` and is mounted at `/api/<game-name>`.

## Directory Structure
```
src/routes/
├── games/
│   ├── index.ts           # Aggregates game-specific routes
│   ├── gomoku.routes.ts   # Gomoku-specific routes
│   ├── chinese-chess.routes.ts # Chinese Chess-specific routes
│   └── AGENTS.md          # This file
├── game.routes.ts         # Generic game routes (legacy)
└── index.ts              # Main route aggregator
```

## Adding a New Game Type
1. Create a new route file in `src/routes/games/` (e.g., `newgame.routes.ts`)
2. Define routes using Express Router
3. Import the route in `src/routes/games/index.ts`
4. Mount the route in `src/routes/index.ts` under a unique path (e.g., `/api/newgame`)

## Example Route File
```typescript
import { Router } from 'express';
// import { newGameController } from '../../controllers/newgame.controller';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'New Game module is healthy',
    timestamp: new Date().toISOString(),
  });
});

// Add game-specific routes here

export default router;
```

## Mounting in Main Routes
In `src/routes/index.ts`:
```typescript
import newGameRoutes from './games/newgame.routes';
// ...
router.use('/newgame', newGameRoutes);
```

## Backward Compatibility
The existing `/api/games` routes remain for generic game operations (saving, loading). Game-specific logic (move validation, AI suggestions) should be placed in game-specific routes.

## Next Steps
- Create game-specific controllers and services
- Extend database models with game type field
- Update game converter to support multiple game formats