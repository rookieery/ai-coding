# Chinese Chess Rules - Agent Notes

## Architecture Pattern

Each piece type has its own validation function exported from a dedicated TypeScript file. All validation functions share the same signature:

```typescript
(board: BoardState, from: BoardCoord, to: BoardCoord) => MoveValidationResult
```

This pattern ensures separation of concerns and makes it easy to unit test each piece independently.

## Implemented Rules

1. **Rook (车)**: Straight line movement, cannot jump over pieces.
2. **Knight (马)**: "日" shape movement, blocked by adjacent orthogonal piece (绊马腿).
3. **Cannon (炮)**: Straight line movement; capturing requires exactly one intermediate piece (炮架); non‑capturing moves cannot jump.
4. **Pawn (兵/卒)**: Moves forward one step; after crossing the river (河界) can also move horizontally; never backward.
5. **Advisor (士)**: One diagonal step within the palace (九宫格).
6. **Elephant (象)**: Two diagonal steps (田字), cannot cross the river, blocked by the intermediate diagonal square (塞象眼).
7. **King (将/帅)**: One orthogonal step within the palace; the two kings must not face each other directly on the same file with no intervening pieces.

## Helper Functions

All rule modules import the following utilities from `../boardState`:

- `getPieceAt(board, coord)`
- `isWithinBoard(coord)`
- `isInPalace(coord, side)`
- `isSameSideOfRiver(coord1, coord2)`
- `isPawnCrossedRiver(piece, coord)`

These functions are already well‑tested and should be reused.

## Implemented Rules (Continued)

8. **Check detection** (`check.ts`): Finds the king of a given side and tests whether any opponent piece can legally move to that square.
9. **Checkmate detection** (`checkmate.ts`): Generates all legal moves for the side in check; if none can break the check, the position is checkmate. Also detects stalemate (no legal moves while not in check).

## Next Steps

- Integrate all rules into a unified game logic module (`gameLogic.ts`). **(Completed)**
- Write unit tests for checkmate and stalemate detection.
- Optimize move generation (e.g., by pre‑computing attack maps) if performance becomes an issue.