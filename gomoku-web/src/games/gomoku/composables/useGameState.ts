import { ref, computed } from 'vue';
import {
  BOARD_SIZE, EMPTY, BLACK, WHITE,
  checkWin, checkDraw, getForbiddenType,
  type Difficulty, type RuleMode
} from '../gameLogic';
import { useVisionBridge } from '../../../composables/useVisionBridge';
import { t } from '../../../i18n';
import type { FrontendGame } from '../../../api/game-api';

export function useGameState() {
  const board = ref<number[][]>(
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY))
  );
  const currentPlayer = ref<number>(BLACK);
  const winner = ref<number>(EMPTY);
  const winningLine = ref<{r: number, c: number}[]>([]);
  const moveHistory = ref<{r: number, c: number, player: number}[]>([]);

  const mode = ref<'pvp' | 'pve'>('pvp');
  const aiDifficulty = ref<Difficulty>('expert');
  const aiRole = ref<'first' | 'second'>('second');
  const ruleMode = ref<RuleMode>('standard');
  const isAnalysisMode = ref<boolean>(false);
  const currentRecordId = ref<string | null>(null);
  const showSteps = ref<boolean>(false);

  const aiPlayer = computed(() => aiRole.value === 'first' ? BLACK : WHITE);

  const forbiddenPoints = computed(() => {
    const points: {r: number, c: number}[] = [];
    if (ruleMode.value !== 'renju') return points;
    if (winner.value !== EMPTY) return points;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board.value[r][c] === EMPTY) {
          if (getForbiddenType(board.value, r, c, BLACK)) {
            points.push({r, c});
          }
        }
      }
    }
    return points;
  });

  const executeMove = (
    r: number,
    c: number,
    player: number,
    playSound: () => void,
    onAiTurn: () => void
  ) => {
    board.value[r][c] = player;
    moveHistory.value.push({r, c, player});
    playSound();

    const winLine = checkWin(board.value, r, c, player, ruleMode.value);
    if (winLine) {
      winner.value = player;
      winningLine.value = winLine;
      return;
    }
    if (checkDraw(board.value)) {
      winner.value = 3;
      return;
    }

    currentPlayer.value = player === BLACK ? WHITE : BLACK;

    if (mode.value === 'pve' && !isAnalysisMode.value && currentPlayer.value === aiPlayer.value && winner.value === EMPTY) {
      onAiTurn();
    }
  };

  const placePiece = (
    r: number,
    c: number,
    playSound: () => void,
    onAiTurn: () => void
  ) => {
    if (winner.value !== EMPTY || board.value[r][c] !== EMPTY) return;
    if (mode.value === 'pve' && !isAnalysisMode.value && currentPlayer.value === aiPlayer.value) return;

    if (ruleMode.value === 'renju' && currentPlayer.value === BLACK) {
      const forbidden = getForbiddenType(board.value, r, c, BLACK);
      if (forbidden) {
        const forbiddenNames: Record<string, string> = {
          'overline': t('forbiddenOverline'),
          'double-four': t('forbiddenDoubleFour'),
          'double-three': t('forbiddenDoubleThree')
        };
        alert(t('forbiddenAlert', forbiddenNames[forbidden]));
        return;
      }
    }

    executeMove(r, c, currentPlayer.value, playSound, onAiTurn);
  };

  const undo = (terminateWorker: () => void, onAiTurn: () => void) => {
    if (moveHistory.value.length === 0) return;

    terminateWorker();

    winner.value = EMPTY;
    winningLine.value = [];

    if (mode.value === 'pvp' || isAnalysisMode.value) {
      const lastMove = moveHistory.value.pop();
      if (lastMove) {
        board.value[lastMove.r][lastMove.c] = EMPTY;
        currentPlayer.value = lastMove.player;
      }
    } else {
      const lastMove = moveHistory.value.pop();
      if (lastMove) {
        board.value[lastMove.r][lastMove.c] = EMPTY;
        currentPlayer.value = lastMove.player;
      }

      if (currentPlayer.value === aiPlayer.value) {
        if (moveHistory.value.length > 0) {
          const prevMove = moveHistory.value.pop();
          if (prevMove) {
            board.value[prevMove.r][prevMove.c] = EMPTY;
            currentPlayer.value = prevMove.player;
          }
        } else {
          onAiTurn();
        }
      }
    }
  };

  const resetGame = (terminateWorker: () => void, onAiTurn: () => void) => {
    terminateWorker();
    board.value = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
    currentPlayer.value = BLACK;
    winner.value = EMPTY;
    moveHistory.value = [];
    winningLine.value = [];
    isAnalysisMode.value = false;
    currentRecordId.value = null;

    if (mode.value === 'pve' && aiPlayer.value === BLACK) {
      onAiTurn();
    }
  };

  const setMode = (newMode: 'pvp' | 'pve', terminateWorker: () => void, onAiTurn: () => void) => {
    mode.value = newMode;
    resetGame(terminateWorker, onAiTurn);
  };

  const setAiDifficulty = (diff: Difficulty, terminateWorker: () => void, onAiTurn: () => void) => {
    aiDifficulty.value = diff;
    resetGame(terminateWorker, onAiTurn);
  };

  const setAiRole = (role: 'first' | 'second', terminateWorker: () => void, onAiTurn: () => void) => {
    aiRole.value = role;
    resetGame(terminateWorker, onAiTurn);
  };

  const setRuleMode = (newRuleMode: RuleMode) => {
    ruleMode.value = newRuleMode;
  };

  const toggleAnalysisMode = (terminateWorker: () => void, onAiTurn: () => void) => {
    if (mode.value !== 'pve') return;
    terminateWorker();
    isAnalysisMode.value = !isAnalysisMode.value;
    if (!isAnalysisMode.value && currentPlayer.value === aiPlayer.value && winner.value === EMPTY) {
      onAiTurn();
    }
  };

  const toggleSteps = () => {
    showSteps.value = !showSteps.value;
  };

  const loadBoardState = (pieces: number[][]) => {
    const mappedBoard: number[][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      mappedBoard[r] = [];
      for (let c = 0; c < BOARD_SIZE; c++) {
        const backendValue = pieces[r]?.[c] ?? 0;
        if (backendValue === 1) {
          mappedBoard[r][c] = BLACK;
        } else if (backendValue === 2) {
          mappedBoard[r][c] = WHITE;
        } else {
          mappedBoard[r][c] = EMPTY;
        }
      }
    }
    board.value = mappedBoard;
    moveHistory.value = [];
    winner.value = EMPTY;
    winningLine.value = [];
    mode.value = 'pve';
    isAnalysisMode.value = true;

    let blackCount = 0;
    let whiteCount = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (board.value[r][c] === BLACK) blackCount++;
        else if (board.value[r][c] === WHITE) whiteCount++;
      }
    }

    currentPlayer.value = blackCount <= whiteCount ? BLACK : WHITE;
  };

  const loadVisionCandidates = () => {
    const visionCandidates = useVisionBridge().consumeVisionCandidates();
    if (visionCandidates && visionCandidates.length > 0) {
      loadBoardState(visionCandidates[0]);
    }
    return visionCandidates;
  };

  const importGame = (game: FrontendGame, terminateWorker: () => void) => {
    terminateWorker();

    board.value = game.board.map(row => [...row]);
    moveHistory.value = [...game.moveHistory];
    mode.value = 'pve';
    aiDifficulty.value = game.aiDifficulty;
    aiRole.value = game.aiRole;
    ruleMode.value = game.ruleMode;
    currentRecordId.value = game.id;

    currentPlayer.value = game.moveHistory.length % 2 === 0 ? BLACK : WHITE;

    winner.value = EMPTY;
    winningLine.value = [];
    if (game.moveHistory.length > 0) {
      const lastMove = game.moveHistory[game.moveHistory.length - 1];
      const winLine = checkWin(board.value, lastMove.r, lastMove.c, lastMove.player, ruleMode.value);
      if (winLine) {
        winner.value = lastMove.player;
        winningLine.value = winLine;
      } else if (checkDraw(board.value)) {
        winner.value = 3;
      }
    }

    isAnalysisMode.value = true;
  };

  const toFrontendGame = (name: string, isPublic: boolean, gameType: string): FrontendGame => {
    return {
      id: currentRecordId.value || Date.now().toString(),
      name: name.trim(),
      board: board.value.map(row => [...row]),
      moveHistory: [...moveHistory.value],
      timestamp: Date.now(),
      mode: mode.value,
      aiDifficulty: aiDifficulty.value,
      aiRole: aiRole.value,
      ruleMode: ruleMode.value,
      isPublic,
      gameType: gameType as 'gomoku' | 'chinese_chess',
    };
  };

  return {
    board,
    currentPlayer,
    winner,
    winningLine,
    moveHistory,
    mode,
    aiDifficulty,
    aiRole,
    ruleMode,
    isAnalysisMode,
    currentRecordId,
    showSteps,

    aiPlayer,
    forbiddenPoints,

    placePiece,
    executeMove,
    undo,
    resetGame,
    setMode,
    setAiDifficulty,
    setAiRole,
    setRuleMode,
    toggleAnalysisMode,
    toggleSteps,
    loadBoardState,
    loadVisionCandidates,
    importGame,
    toFrontendGame,
  };
}
