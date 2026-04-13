# Chinese Chess Engine - Agent Notes

## Engine Module (`engine.ts`)

Created to provide core move generation functionality for Chinese Chess.

### Key Functions

1. **`getLegalMovesForPiece(board: BoardState, coord: BoardCoord): BoardCoord[]`**
   - Returns all legal target coordinates for a piece at the given coordinate.
   - Validates moves using piece‑specific rule functions.
   - Filters out moves that would leave the piece's own king in check (the “送将” rule).
   - Returns an empty array if the coordinate is empty or out of bounds.

2. **`generateAllLegalMoves(board: BoardState, side: PlayerSide): Array<{from: BoardCoord, to: BoardCoord}>`**
   - Generates all legal moves for a given side.
   - Built on top of `getLegalMovesForPiece` for consistency.

### Design Decisions

- **Brute‑force generation**: The current implementation iterates over all 9×10 board positions for each piece. This is acceptable because the board is small (90 cells) and the validation functions are fast.
- **Check safety**: Every candidate move is simulated and the resulting board is tested for check using `isCheck` from `./rules/check`. Moves that leave the moving side’s king in check are discarded.
- **Reuse of rule validators**: The engine does not duplicate the piece‑specific movement logic; it delegates to the existing validation functions (`validateRookMove`, `validateKnightMove`, etc.) via `getValidatorForPieceType`.

### Unit Tests

- A comprehensive test suite (`engine.test.ts`) verifies correct move generation for each piece type, including edge cases (blocked paths, captures, check constraints).
- Tests are located in `src/chinese‑chess/__tests__/`.

### Integration with UI

The `getLegalMovesForPiece` function is designed to be called from the UI layer (e.g., `Board.vue`) when a piece is selected, to highlight possible target squares. The UI can pass the returned coordinates to the visual hint system (see S23b).

### Future Optimizations

- Pre‑compute attack maps for sliding pieces (rook, cannon) to speed up move generation.
- Cache legal moves for a given board state and side (hash‑based) to avoid repeated computation during search.
- Consider generating moves directly from piece‑specific patterns instead of validating every target cell, especially for knights and kings.

## UI Coordinate Display

Implemented traditional Xiangqi coordinate notation:
- Top edge (Black side) shows numbers 1–9 (left‑to‑right).
- Bottom edge (Red side) shows Chinese numerals 九 (nine) through 一 (one), right‑to‑left.

Translation keys:
- `columnTopNumbers`: comma‑separated numbers "1,2,3,4,5,6,7,8,9"
- `columnBottomChineseNumbers`: comma‑separated Chinese numerals "九,八,七,六,五,四,三,二,一"

Both sequences are defined in each locale's message dictionary (`i18n.ts`) and split in `Board.vue`'s computed properties `topColumnLabels` and `bottomColumnLabels`. The coordinate divs use the same width classes as the board cells for pixel‑perfect alignment.
## Notation Generator (`notation.ts`)

Implements standard Xiangqi notation (Chinese Descriptive Notation) that converts coordinate moves to traditional terms like "炮二平五" (cannon from column 2 to column 5 horizontally) and "马八进七" (knight from column 8 forward to column 7).

### Key Functions

1. **`moveToNotation(move: MoveHistory, boardState?: any): string`**
   - Returns a notation string with translation keys, e.g., `pieceRedCannon八平五`.
   - Used when the caller needs to translate the piece character later.

2. **`moveToDisplayNotation(move: MoveHistory, t: (key: string) => string, boardState?: any): string`**
   - Returns a fully translated notation string, e.g., `炮八平五`.
   - Accepts the i18n `t` function to resolve piece names.

3. **`movesToNotations(moveHistory: MoveHistory[], boardStates?: any[]): string[]`**
   - Batch conversion of move history.

### Coordinate Mapping

- Red side: uses Chinese numerals (一 to 九), right‑to‑left. Internal column `0` → "九", column `8` → "一".
- Black side: uses Arabic digits (1 to 9), left‑to‑right. Internal column `0` → "1", column `8` → "9".

### Direction Detection

- **平** (horizontal): when row does not change.
- **进** (forward): when row changes toward the opponent's side (Red upward, Black downward).
- **退** (backward): when row changes toward the player's own side.

### Distance Description

- For horizontal moves (`平`): target column name.
- For vertical moves (`进`/`退`) with same column: number of steps (absolute row difference).
- For diagonal moves (`进`/`退`) with different column: target column name.

### UI Integration

The `ChineseChessHistoryPanel` component (in `src/components/chinese‑chess/HistoryPanel.vue`) displays the notation list in the right sidebar, with auto‑scroll to bottom and copy‑to‑clipboard support.

### Future Extensions

- Distinguish between multiple identical pieces on the same column (前车 vs. 后车).
- Support algebraic notation (e.g., "R2=5") for international users.
- Include capture markers (吃) and check markers (将) in the notation.

## Move Outcome Detection (`evaluateMoveResult`)

Added to `gameLogic.ts` to provide detailed move outcome detection after a move is made.

### Purpose

Detects four key game states triggered by a move:
1. **Capture** (吃子) – whether the move captured an opponent's piece
2. **Check** (将军) – whether the move puts the opponent's king in check
3. **Checkmate** (绝杀) – whether the move results in checkmate
4. **Stalemate** (困毙) – whether the move results in stalemate (no legal moves while not in check)

### Usage

```typescript
const outcome = evaluateMoveResult(board, player, isCapture);
// outcome.capture, outcome.check, outcome.checkmate, outcome.stalemate, outcome.gameOver
```

### Implementation Notes

- Handles the edge case where the opponent's king has been captured (treats as checkmate).
- Reuses existing `isCheck`, `isCheckmate`, `isStalemate` functions from the rules module.
- Returns a simple object that can be easily consumed by UI components for notifications, sound effects, etc.
- Integrated into `ChineseChessView.vue` via the `moveResult` reactive variable, updated after each move.
