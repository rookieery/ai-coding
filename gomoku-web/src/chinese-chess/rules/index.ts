/**
 * 中国象棋规则验证函数统一导出
 */

export { validateRookMove } from './rook';
export { validateKnightMove } from './knight';
export { validateCannonMove } from './cannon';
export { validatePawnMove } from './pawn';
export { validateAdvisorMove, validateElephantMove } from './advisor-elephant';
export { validateKingMove } from './king';
export { isCheck, getCheckingPieces } from './check';