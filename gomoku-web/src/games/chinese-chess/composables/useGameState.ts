import { ref, computed } from 'vue';
import {
  PlayerSide,
  PieceType,
  GameStatus,
  type GameMode,
  type Difficulty,
  type BoardState,
  type BoardCoord,
  type MoveHistory,
  type GameState,
} from '../types';
import {
  validateMove,
  getPieceLegalMoves,
  evaluateGameResult,
  evaluateMoveResult,
} from '../gameLogic';
import { createInitialBoard, movePiece as boardMovePiece, getPieceAt } from '../boardState';
import { type ChineseChessFrontendGame, type GameType } from '../../../api/game-api';
import { convertCodesToBoardState } from '../utils';

export function useGameState() {
  const board = ref<BoardState>(createInitialBoard());
  const currentPlayer = ref<PlayerSide>(PlayerSide.RED);
  const winner = ref<PlayerSide | undefined>(undefined);
  const gameStatus = ref<GameStatus>(GameStatus.NOT_STARTED);
  const mode = ref<GameMode>('pvp');
  const aiDifficulty = ref<Difficulty>('expert');
  const aiRole = ref<'red' | 'black'>('black');
  const isAnalysisMode = ref(false);
  const currentRecordId = ref<string | null>(null);
  const showSteps = ref(false);
  const moveHistory = ref<MoveHistory[]>([]);
  const moveResult = ref<{
    capture: boolean;
    check: boolean;
    checkmate: boolean;
    stalemate: boolean;
    gameOver: boolean;
  } | null>(null);

  const selectedPiece = ref<BoardCoord | null>(null);
  const validMoves = ref<BoardCoord[]>([]);
  const winningLine = ref<BoardCoord[]>([]);

  const aiPlayer = computed(() => aiRole.value === 'red' ? PlayerSide.RED : PlayerSide.BLACK);

  const boardPieceCount = computed(() => {
    let count = 0;
    for (const row of board.value) {
      for (const cell of row) {
        if (cell) count++;
      }
    }
    return count;
  });

  const executeMove = (
    from: BoardCoord,
    to: BoardCoord,
    player: PlayerSide,
    playSound: () => void,
    onAiTurn: () => void
  ): { success: boolean; reason?: string } => {
    const validation = validateMove(board.value, from, to, player);
    if (!validation.isValid) {
      return { success: false, reason: validation.reason };
    }

    const targetPiece = getPieceAt(board.value, to);
    const capturedPiece = targetPiece ? { type: targetPiece.type, side: targetPiece.side } : undefined;

    board.value = boardMovePiece(board.value, from, to);
    moveHistory.value.push({
      from,
      to,
      piece: getPieceAt(board.value, to)!.type,
      side: player,
      timestamp: Date.now(),
      capturedPiece
    });
    playSound();

    const moveOutcome = evaluateMoveResult(board.value, player, !!capturedPiece);
    moveResult.value = moveOutcome;

    const gameState: GameState = {
      board: board.value,
      currentPlayer: player === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED,
      status: gameStatus.value,
      moveHistory: moveHistory.value,
      config: { mode: mode.value, difficulty: aiDifficulty.value }
    };
    const evaluated = evaluateGameResult(gameState);
    gameStatus.value = evaluated.status;
    winner.value = evaluated.winner;
    currentPlayer.value = evaluated.currentPlayer;

    if (mode.value === 'pve' && !isAnalysisMode.value && currentPlayer.value === aiPlayer.value && winner.value === undefined) {
      onAiTurn();
    }

    return { success: true };
  };

  const handleSelectPiece = (coord: BoardCoord) => {
    selectedPiece.value = coord;
    const gameState: GameState = {
      board: board.value,
      currentPlayer: currentPlayer.value,
      status: gameStatus.value,
      moveHistory: moveHistory.value,
      config: { mode: mode.value, difficulty: aiDifficulty.value }
    };
    validMoves.value = getPieceLegalMoves(gameState, coord);
  };

  const clearSelection = () => {
    selectedPiece.value = null;
    validMoves.value = [];
  };

  const undo = (terminateWorker: () => void, onAiTurn: () => void) => {
    if (moveHistory.value.length === 0) return;

    terminateWorker();
    winner.value = undefined;
    gameStatus.value = GameStatus.NOT_STARTED;
    winningLine.value = [];

    const restoreMove = (move: MoveHistory) => {
      board.value = boardMovePiece(board.value, move.to, move.from);
      if (move.capturedPiece) {
        board.value[move.to.row][move.to.col] = {
          type: move.capturedPiece.type,
          side: move.capturedPiece.side,
          coord: { ...move.to }
        };
      }
      currentPlayer.value = move.side;
    };

    if (mode.value === 'pvp' || isAnalysisMode.value) {
      const lastMove = moveHistory.value.pop();
      if (lastMove) restoreMove(lastMove);
    } else {
      const lastMove = moveHistory.value.pop();
      if (lastMove) restoreMove(lastMove);
      if (currentPlayer.value === aiPlayer.value) {
        if (moveHistory.value.length > 0) {
          const prevMove = moveHistory.value.pop();
          if (prevMove) restoreMove(prevMove);
        } else {
          onAiTurn();
        }
      }
    }
  };

  const resetGame = (terminateWorker: () => void, onAiTurn: () => void) => {
    terminateWorker();
    board.value = createInitialBoard();
    currentPlayer.value = PlayerSide.RED;
    winner.value = undefined;
    gameStatus.value = GameStatus.NOT_STARTED;
    moveHistory.value = [];
    winningLine.value = [];
    isAnalysisMode.value = false;
    currentRecordId.value = null;
    moveResult.value = null;

    if (mode.value === 'pve' && aiPlayer.value === PlayerSide.RED) {
      onAiTurn();
    }
  };

  const setMode = (newMode: GameMode, terminateWorker: () => void, onAiTurn: () => void) => {
    mode.value = newMode;
    resetGame(terminateWorker, onAiTurn);
  };

  const setAiDifficulty = (diff: Difficulty, terminateWorker: () => void, onAiTurn: () => void) => {
    aiDifficulty.value = diff;
    resetGame(terminateWorker, onAiTurn);
  };

  const setAiRole = (role: 'red' | 'black', terminateWorker: () => void, onAiTurn: () => void) => {
    aiRole.value = role;
    resetGame(terminateWorker, onAiTurn);
  };

  const toggleAnalysisMode = (terminateWorker: () => void, onAiTurn: () => void) => {
    if (mode.value !== 'pve') return;
    terminateWorker();
    isAnalysisMode.value = !isAnalysisMode.value;
    if (!isAnalysisMode.value && currentPlayer.value === aiPlayer.value && winner.value === undefined) {
      onAiTurn();
    }
  };

  const toggleSteps = () => {
    showSteps.value = !showSteps.value;
  };

  const importGame = (fullGame: ChineseChessFrontendGame, terminateWorker: () => void) => {
    terminateWorker();

    const parsedMoveHistory: MoveHistory[] = [];
    if (fullGame.moveHistory && Array.isArray(fullGame.moveHistory)) {
      for (const raw of fullGame.moveHistory as unknown[]) {
        if (raw == null || typeof raw !== 'object') continue;
        const move = raw as Record<string, unknown>;
        const from = move.from as { col: number; row: number } | undefined;
        const to = move.to as { col: number; row: number } | undefined;
        const piece = move.piece as string | undefined;
        const side = move.side as string | undefined;
        if (!from || !to || !piece || !side) continue;
        parsedMoveHistory.push({
          from: { col: from.col, row: from.row },
          to: { col: to.col, row: to.row },
          piece: piece as PieceType,
          side: side as PlayerSide,
          timestamp: (move.timestamp as number) || Date.now(),
          capturedPiece: move.capturedPiece ? {
            type: (move.capturedPiece as Record<string, string>).type as PieceType,
            side: (move.capturedPiece as Record<string, string>).side as PlayerSide,
          } : undefined,
        });
      }
    }

    const replayBoard = createInitialBoard();
    for (const move of parsedMoveHistory) {
      const piece = getPieceAt(replayBoard, move.from);
      if (piece) {
        replayBoard[move.from.row][move.from.col] = null;
        replayBoard[move.to.row][move.to.col] = {
          ...piece,
          coord: { ...move.to },
        };
      }
    }

    board.value = replayBoard;
    moveHistory.value = parsedMoveHistory;
    mode.value = 'pve';
    aiDifficulty.value = fullGame.aiDifficulty || 'intermediate';
    aiRole.value = fullGame.aiRole || 'black';
    currentRecordId.value = fullGame.id;

    currentPlayer.value = parsedMoveHistory.length % 2 === 0 ? PlayerSide.RED : PlayerSide.BLACK;
    winner.value = undefined;
    gameStatus.value = GameStatus.NOT_STARTED;
    if (parsedMoveHistory.length > 0) {
      const gameState: GameState = {
        board: board.value,
        currentPlayer: currentPlayer.value,
        status: gameStatus.value,
        moveHistory: moveHistory.value,
        config: { mode: mode.value, difficulty: aiDifficulty.value }
      };
      const evaluated = evaluateGameResult(gameState);
      gameStatus.value = evaluated.status;
      winner.value = evaluated.winner;
    }

    isAnalysisMode.value = true;
  };

  const loadBoardState = (codes: number[][]) => {
    const newBoard = convertCodesToBoardState(codes);
    board.value = newBoard;
    moveHistory.value = [];
    selectedPiece.value = null;
    validMoves.value = [];
    moveResult.value = null;

    let redCount = 0;
    let blackCount = 0;
    for (const row of newBoard) {
      for (const cell of row) {
        if (cell) {
          if (cell.side === PlayerSide.RED) redCount++;
          else blackCount++;
        }
      }
    }
    currentPlayer.value = redCount <= blackCount ? PlayerSide.RED : PlayerSide.BLACK;

    gameStatus.value = GameStatus.IN_PROGRESS;
    mode.value = 'pvp';
    isAnalysisMode.value = true;
  };

  const toFrontendGame = (name: string, isPublic: boolean, gameType: string): ChineseChessFrontendGame => {
    return {
      id: currentRecordId.value || Date.now().toString(),
      name: name.trim(),
      board: board.value.map(row => [...row]),
      moveHistory: [...moveHistory.value] as ChineseChessFrontendGame['moveHistory'],
      timestamp: Date.now(),
      mode: mode.value === 'analysis' ? 'pve' : mode.value,
      aiDifficulty: aiDifficulty.value,
      aiRole: aiRole.value,
      isPublic,
      gameType: gameType as GameType,
    };
  };

  return {
    board,
    currentPlayer,
    winner,
    gameStatus,
    mode,
    aiDifficulty,
    aiRole,
    isAnalysisMode,
    currentRecordId,
    showSteps,
    moveHistory,
    moveResult,
    selectedPiece,
    validMoves,
    winningLine,
    aiPlayer,
    boardPieceCount,

    executeMove,
    handleSelectPiece,
    clearSelection,
    undo,
    resetGame,
    setMode,
    setAiDifficulty,
    setAiRole,
    toggleAnalysisMode,
    toggleSteps,
    importGame,
    loadBoardState,
    toFrontendGame,
  };
}
