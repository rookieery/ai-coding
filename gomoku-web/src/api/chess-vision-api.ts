import { PieceType, PlayerSide } from '../games/chinese-chess/types';
import type { BoardState, Piece } from '../games/chinese-chess/types';

export const CHESS_PIECE_CODES = {
  EMPTY: 0,
  RED_KING: 1,
  RED_ADVISOR: 2,
  RED_ELEPHANT: 3,
  RED_KNIGHT: 4,
  RED_ROOK: 5,
  RED_CANNON: 6,
  RED_PAWN: 7,
  BLACK_KING: 8,
  BLACK_ADVISOR: 9,
  BLACK_ELEPHANT: 10,
  BLACK_KNIGHT: 11,
  BLACK_ROOK: 12,
  BLACK_CANNON: 13,
  BLACK_PAWN: 14,
} as const;

export type ChessPieceCode = (typeof CHESS_PIECE_CODES)[keyof typeof CHESS_PIECE_CODES];

const CODE_TO_PIECE: Record<number, { type: PieceType; side: PlayerSide }> = {
  [CHESS_PIECE_CODES.RED_KING]: { type: PieceType.KING, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.RED_ADVISOR]: { type: PieceType.ADVISOR, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.RED_ELEPHANT]: { type: PieceType.ELEPHANT, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.RED_KNIGHT]: { type: PieceType.KNIGHT, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.RED_ROOK]: { type: PieceType.ROOK, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.RED_CANNON]: { type: PieceType.CANNON, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.RED_PAWN]: { type: PieceType.PAWN, side: PlayerSide.RED },
  [CHESS_PIECE_CODES.BLACK_KING]: { type: PieceType.KING, side: PlayerSide.BLACK },
  [CHESS_PIECE_CODES.BLACK_ADVISOR]: { type: PieceType.ADVISOR, side: PlayerSide.BLACK },
  [CHESS_PIECE_CODES.BLACK_ELEPHANT]: { type: PieceType.ELEPHANT, side: PlayerSide.BLACK },
  [CHESS_PIECE_CODES.BLACK_KNIGHT]: { type: PieceType.KNIGHT, side: PlayerSide.BLACK },
  [CHESS_PIECE_CODES.BLACK_ROOK]: { type: PieceType.ROOK, side: PlayerSide.BLACK },
  [CHESS_PIECE_CODES.BLACK_CANNON]: { type: PieceType.CANNON, side: PlayerSide.BLACK },
  [CHESS_PIECE_CODES.BLACK_PAWN]: { type: PieceType.PAWN, side: PlayerSide.BLACK },
};

export function convertCodesToBoardState(codes: number[][]): BoardState {
  return codes.map((row, rowIdx) =>
    row.map((code, colIdx) => {
      if (code === CHESS_PIECE_CODES.EMPTY) return null;
      const mapping = CODE_TO_PIECE[code];
      if (!mapping) return null;
      const piece: Piece = {
        type: mapping.type,
        side: mapping.side,
        coord: { row: rowIdx, col: colIdx },
      };
      return piece;
    }),
  );
}

export function convertBoardStateToCodes(board: BoardState): number[][] {
  const PIECE_TO_CODE = new Map<string, number>();
  PIECE_TO_CODE.set(`king_red`, CHESS_PIECE_CODES.RED_KING);
  PIECE_TO_CODE.set(`advisor_red`, CHESS_PIECE_CODES.RED_ADVISOR);
  PIECE_TO_CODE.set(`elephant_red`, CHESS_PIECE_CODES.RED_ELEPHANT);
  PIECE_TO_CODE.set(`knight_red`, CHESS_PIECE_CODES.RED_KNIGHT);
  PIECE_TO_CODE.set(`rook_red`, CHESS_PIECE_CODES.RED_ROOK);
  PIECE_TO_CODE.set(`cannon_red`, CHESS_PIECE_CODES.RED_CANNON);
  PIECE_TO_CODE.set(`pawn_red`, CHESS_PIECE_CODES.RED_PAWN);
  PIECE_TO_CODE.set(`king_black`, CHESS_PIECE_CODES.BLACK_KING);
  PIECE_TO_CODE.set(`advisor_black`, CHESS_PIECE_CODES.BLACK_ADVISOR);
  PIECE_TO_CODE.set(`elephant_black`, CHESS_PIECE_CODES.BLACK_ELEPHANT);
  PIECE_TO_CODE.set(`knight_black`, CHESS_PIECE_CODES.BLACK_KNIGHT);
  PIECE_TO_CODE.set(`rook_black`, CHESS_PIECE_CODES.BLACK_ROOK);
  PIECE_TO_CODE.set(`cannon_black`, CHESS_PIECE_CODES.BLACK_CANNON);
  PIECE_TO_CODE.set(`pawn_black`, CHESS_PIECE_CODES.BLACK_PAWN);

  return board.map((row) =>
    row.map((cell) => {
      if (!cell) return CHESS_PIECE_CODES.EMPTY;
      return PIECE_TO_CODE.get(`${cell.type}_${cell.side}`) ?? CHESS_PIECE_CODES.EMPTY;
    }),
  );
}
