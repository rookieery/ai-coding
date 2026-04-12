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