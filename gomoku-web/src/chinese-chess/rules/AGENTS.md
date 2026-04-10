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

## Next Steps

- Create a barrel file (`index.ts`) to re‑export all validation functions.
- Implement check detection (`check.ts`) that loops over all opponent pieces and uses the per‑piece validators.
- Implement checkmate detection (`checkmate.ts`) that generates all legal moves for the side in check and tests if any escape exists.
- Integrate all rules into a unified game logic module (`gameLogic.ts`).