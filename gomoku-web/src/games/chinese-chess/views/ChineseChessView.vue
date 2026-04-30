<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, onActivated, onDeactivated } from 'vue';
import { Download, Trash2, X, RefreshCw } from 'lucide-vue-next';
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
  type GameConfig,
  type CapturedPiece,
} from '../types';
import {
  validateMove,
  makeMove,
  createNewGame,
  getLegalMoves,
  getPieceLegalMoves,
  isGameOver,
  getWinner,
  evaluateGameResult,
  evaluateMoveResult,
} from '../gameLogic';
import { createInitialBoard, movePiece as boardMovePiece, getPieceAt } from '../boardState';
import Board from '../components/Board.vue';
import GameControls from '../components/GameControls.vue';
import ChineseChessHistoryPanel from '../components/HistoryPanel.vue';
import { t, currentTheme } from '../../../i18n';
import { gameApi, type FrontendGame, type GameListItem, type GameType } from '../../../api/game-api';
import { useGlobalAuth } from '../../../composables/useAuth';
import { useGlobalSettings } from '../../../composables/useSettings';

const GAME_TYPE: GameType = 'chinese_chess';

defineOptions({
  name: 'ChineseChessView'
});

// 棋盘状态
const board = ref<BoardState>(createInitialBoard());
const currentPlayer = ref<PlayerSide>(PlayerSide.RED);
const winner = ref<PlayerSide | undefined>(undefined);
const gameStatus = ref<GameStatus>(GameStatus.NOT_STARTED);
const mode = ref<GameMode>('pvp');
const aiDifficulty = ref<Difficulty>('expert');
const aiRole = ref<'red' | 'black'>('black'); // AI执红方还是黑方
const isAnalysisMode = ref<boolean>(false);
const showThinking = ref<boolean>(false);
const showSteps = ref<boolean>(false);
const thinkingPath = ref<{coord: BoardCoord, side: PlayerSide}[]>([]);
const currentRecordId = ref<string | null>(null);
const isAiThinking = ref<boolean>(false);

// 移动结果状态
const moveResult = ref<{
  capture: boolean;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  gameOver: boolean;
} | null>(null);

// 获取认证信息
const auth = useGlobalAuth();
const settings = useGlobalSettings();
// 主题解包（因为 settings.chessTheme 是 ref，模板中需要自动解包）
const theme = computed(() => settings.chessTheme.value);

const isSaveModalOpen = ref(false);
const isRecordsModalOpen = ref(false);
const saveName = ref('');
const gameRecords = ref<GameListItem[]>([]);

const fetchRecords = async () => {
  try {
    const result = await gameApi.getGames(GAME_TYPE);
    gameRecords.value = result.games;
  } catch {
    gameRecords.value = [];
  }
};

onMounted(fetchRecords);

const saveNameError = ref('');

const openSaveModal = () => {
  saveName.value = '';
  saveNameError.value = '';
  isSaveModalOpen.value = true;
};

const closeSaveModal = () => {
  isSaveModalOpen.value = false;
};

// 检查用户是否有权限编辑/删除棋谱
const canEditGame = (game: GameListItem) => {
  const isAdmin = auth.user.value?.role === 'ADMIN';
  return isAdmin || !game.isPublic;
};

const saveCurrentGame = async () => {
  if (!saveName.value.trim()) return;

  if (gameRecords.value.some(g => g.name === saveName.value.trim())) {
    saveNameError.value = t('nameExists');
    return;
  }

  saveNameError.value = '';

  const isUserAdmin = auth.user.value?.role === 'ADMIN';

  const newGame: FrontendGame = {
    id: Date.now().toString(),
    name: saveName.value.trim(),
    board: board.value.map(row => [...row]),
    moveHistory: [...moveHistory.value],
    timestamp: Date.now(),
    mode: mode.value,
    aiDifficulty: aiDifficulty.value,
    aiRole: aiRole.value,
    ruleMode: 'standard',
    isPublic: isUserAdmin,
    gameType: GAME_TYPE,
  };

  try {
    const savedGame = await gameApi.saveGame(newGame);
    currentRecordId.value = savedGame.id;
    closeSaveModal();
    await fetchRecords();
    notify(t('saveSuccess'));
  } catch {
    notify(t('saveFailed'));
  }
};

const openRecordsModal = () => {
  fetchRecords();
  isRecordsModalOpen.value = true;
};

const closeRecordsModal = () => {
  isRecordsModalOpen.value = false;
};

const importGame = async (game: GameListItem) => {
  terminateWorker();

  try {
    const fullGame = await gameApi.getGame(game.id, GAME_TYPE);

    // Validate and parse move history for Chinese chess
    // Handle both old format (Gomoku-style: {color, step, timestamp}) and new format
    let parsedMoveHistory: MoveHistory[] = [];
    if (fullGame.moveHistory && Array.isArray(fullGame.moveHistory)) {
      parsedMoveHistory = fullGame.moveHistory
        .filter((move): move is {
          from?: { col: number; row: number };
          to?: { col: number; row: number };
          piece?: string;
          side?: string;
          timestamp?: number;
          capturedPiece?: { type: string; side: string };
        } => move && typeof move === 'object')
        .map((move, index) => {
          // Check if it's the new Chinese chess format
          if (move.from && move.to && move.piece && move.side) {
            return {
              from: { col: move.from.col, row: move.from.row },
              to: { col: move.to.col, row: move.to.row },
              piece: move.piece as PieceType,
              side: move.side as PlayerSide,
              timestamp: move.timestamp || Date.now(),
              capturedPiece: move.capturedPiece ? {
                type: move.capturedPiece.type as PieceType,
                side: move.capturedPiece.side as PlayerSide,
              } : undefined,
            };
          }
          // Skip old format moves - they can't be properly converted
          return null;
        })
        .filter((move): move is MoveHistory => move !== null);
    }

    // Initialize board to starting position, then replay all moves to reconstruct final state
    const replayBoard = createInitialBoard();
    for (const move of parsedMoveHistory) {
      const piece = getPieceAt(replayBoard, move.from);
      if (piece) {
        // Execute the move on the replay board
        replayBoard[move.from.row][move.from.col] = null;
        replayBoard[move.to.row][move.to.col] = {
          ...piece,
          coord: { ...move.to },
        };
      }
    }

    // Assign the replayed board to the reactive state
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
    closeRecordsModal();
    notify(t('importSuccess'));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    notify(`${t('importFailed')}: ${errorMsg}`);
  }
};

const gameToDelete = ref<string | null>(null);
const editingGameId = ref<string | null>(null);
const editingName = ref('');

const startEditing = (game: GameListItem) => {
  if (!canEditGame(game)) {
    notify(game.isPublic ? t('noPermissionEditPublic') : t('noPermissionEdit'));
    return;
  }
  editingGameId.value = game.id;
  editingName.value = game.name;
};

const saveEdit = async () => {
  if (!editingGameId.value) return;
  const name = editingName.value.trim();
  if (!name) {
    editingGameId.value = null;
    return;
  }

  const index = gameRecords.value.findIndex(g => g.id === editingGameId.value);
  if (index !== -1) {
    const game = gameRecords.value[index];
    if (!canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionEditPublic') : t('noPermissionEdit'));
      editingGameId.value = null;
      return;
    }

    try {
      const fullGame = await gameApi.getGame(game.id, GAME_TYPE);
      const updatedGame: FrontendGame = { ...fullGame, name };
      await gameApi.updateGame(game.id, updatedGame);
      await fetchRecords();
      notify(t('updateSuccess'));
    } catch {
      notify(t('updateFailed'));
    }
  }
  editingGameId.value = null;
};

const cancelEditing = () => {
  editingGameId.value = null;
};

const updateGame = async (id: string) => {
  const index = gameRecords.value.findIndex(g => g.id === id);
  if (index !== -1) {
    const game = gameRecords.value[index];
    if (!canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionUpdatePublic') : t('noPermissionUpdate'));
      return;
    }

    try {
      const fullGame = await gameApi.getGame(id, GAME_TYPE);
      const updatedGame: FrontendGame = {
        ...fullGame,
        board: board.value.map(row => [...row]),
        moveHistory: [...moveHistory.value],
      };
      await gameApi.updateGame(id, updatedGame);
      await fetchRecords();
      notify(t('updateSuccess'));
    } catch {
      notify(t('updateFailed'));
    }
  }
};

const deleteGame = (id: string) => {
  const game = gameRecords.value.find(g => g.id === id);
  if (!game) return;

  if (!canEditGame(game)) {
    notify(game.isPublic ? t('noPermissionDeletePublic') : t('noPermissionDelete'));
    return;
  }

  gameToDelete.value = id;
};

const confirmDeleteGame = async () => {
  if (gameToDelete.value) {
    const gameId = gameToDelete.value;
    const game = gameRecords.value.find(g => g.id === gameId);

    if (game && !canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionDeletePublic') : t('noPermissionDelete'));
      gameToDelete.value = null;
      return;
    }

    try {
      await gameApi.deleteGame(gameId, GAME_TYPE);

      if (currentRecordId.value === gameId) {
        currentRecordId.value = null;
      }
      await fetchRecords();
      notify(t('deleteSuccess'));
    } catch {
      notify(t('deleteFailed'));
    }

    gameToDelete.value = null;
  }
};

const cancelDeleteGame = () => {
  gameToDelete.value = null;
};

const moveHistory = ref<MoveHistory[]>([]);

let worker: Worker | null = null;

const terminateWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
  }
  thinkingPath.value = [];
  isAiThinking.value = false;
};

onUnmounted(() => {
  terminateWorker();
});

onDeactivated(() => {
  terminateWorker();
});

onActivated(() => {
  // 组件重新激活时，可以重新启动AI思考（如果需要）
});

const winningLine = ref<BoardCoord[]>([]);
const hintMove = ref<{from: BoardCoord, to: BoardCoord} | null>(null);
const showNotification = ref(false);
const notificationMessage = ref('');

const vFocus = {
  mounted: (el: HTMLElement) => el.focus()
};

const notify = (msg: string) => {
  notificationMessage.value = msg;
  showNotification.value = true;
  setTimeout(() => {
    showNotification.value = false;
  }, 2000);
};

const handleCopySuccess = () => {
  notify(t('copySuccess'));
};

const aiPlayer = computed(() => aiRole.value === 'red' ? PlayerSide.RED : PlayerSide.BLACK);

const statusText = computed(() => {
  if (winner.value === PlayerSide.RED) return t('statusRedWin');
  if (winner.value === PlayerSide.BLACK) return t('statusBlackWinChess');
  if (gameStatus.value === GameStatus.CHECKMATE) {
    return winner.value === PlayerSide.RED ? t('statusRedWin') : t('statusBlackWinChess');
  }
  if (gameStatus.value === GameStatus.STALEMATE) return t('statusStalemate');
  if (gameStatus.value === GameStatus.DRAW) return t('statusDraw');
  if (gameStatus.value === GameStatus.CHECK) return t('statusCheck');

  const turnText = currentPlayer.value === PlayerSide.RED ? t('statusRedTurn') : t('statusBlackTurnChess');
  const thinkingText = isAiThinking.value ? ` (${t('aiThinking')})` : '';

  if (isAnalysisMode.value) return `${t('analysisMode')} - ${turnText}${thinkingText}`;
  return `${turnText}${thinkingText}`;
});

const aiRoleText = computed(() => aiRole.value === 'red' ? t('chessRed') : t('chessBlack'));
const aiDifficultyText = computed(() => {
  switch (aiDifficulty.value) {
    case 'beginner': return t('difficultyBeginner');
    case 'intermediate': return t('difficultyIntermediate');
    case 'advanced': return t('difficultyAdvanced');
    case 'expert': return t('difficultyExpert');
    case 'neural': return t('difficultyNeural');
  }
});

const playSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    // Ignore audio errors
  }
};

const aiMove = () => {
  if (winner.value !== undefined || mode.value !== 'pve' || isAnalysisMode.value) return;
  if (currentPlayer.value !== aiPlayer.value) return;

  terminateWorker();
  isAiThinking.value = true;
  worker = new Worker(new URL('../ai/aiWorker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    if (e.data.type === 'thinking') {
      if (showThinking.value) {
        thinkingPath.value = e.data.path;
      }
    } else if (e.data.type === 'result') {
      isAiThinking.value = false;
      thinkingPath.value = [];
      const move = e.data.move;
      if (move && currentPlayer.value === aiPlayer.value && winner.value === undefined && mode.value === 'pve' && !isAnalysisMode.value) {
        executeMove(move.from, move.to, aiPlayer.value);
      }
    }
  };

  worker.postMessage({
    board: board.value.map(row => [...row]),
    aiPlayer: aiPlayer.value,
    difficulty: aiDifficulty.value
  });
};

const resetGame = () => {
  terminateWorker();
  board.value = createInitialBoard();
  currentPlayer.value = PlayerSide.RED;
  winner.value = undefined;
  gameStatus.value = GameStatus.NOT_STARTED;
  moveHistory.value = [];
  winningLine.value = [];
  hintMove.value = null;
  isAnalysisMode.value = false;
  currentRecordId.value = null;
  moveResult.value = null;

  if (mode.value === 'pve' && aiPlayer.value === PlayerSide.RED) {
    aiMove();
  }
};

const setMode = (newMode: GameMode) => {
  mode.value = newMode;
  resetGame();
};

const setAiDifficulty = (diff: Difficulty) => {
  aiDifficulty.value = diff;
  resetGame();
};

const setAiRole = (role: 'red' | 'black') => {
  aiRole.value = role;
  resetGame();
};

const toggleAnalysisMode = () => {
  if (mode.value !== 'pve') return;
  terminateWorker();
  isAnalysisMode.value = !isAnalysisMode.value;
  if (!isAnalysisMode.value && currentPlayer.value === aiPlayer.value && winner.value === undefined) {
    aiMove();
  }
};

const toggleThinking = () => {
  showThinking.value = !showThinking.value;
  if (!showThinking.value) {
    thinkingPath.value = [];
  }
};

const executeMove = (from: BoardCoord, to: BoardCoord, player: PlayerSide) => {
  // 验证移动
  const validation = validateMove(board.value, from, to, player);
  if (!validation.isValid) {
    notify(`Invalid move: ${validation.reason}`);
    return;
  }

  // 执行移动
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
  hintMove.value = null;

  // 检测移动结果（吃子、将军、绝杀、困毙）
  const moveOutcome = evaluateMoveResult(board.value, player, !!capturedPiece);
  moveResult.value = moveOutcome;

  // 更新游戏状态
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
    aiMove();
  }
};

const selectedPiece = ref<BoardCoord | null>(null);
const validMoves = ref<BoardCoord[]>([]);

const handleSelectPiece = (coord: BoardCoord) => {
  selectedPiece.value = coord;
  // 计算合法移动
  const gameState: GameState = {
    board: board.value,
    currentPlayer: currentPlayer.value,
    status: gameStatus.value,
    moveHistory: moveHistory.value,
    config: { mode: mode.value, difficulty: aiDifficulty.value }
  };
  validMoves.value = getPieceLegalMoves(gameState, coord);
};

const handleMovePiece = (from: BoardCoord, to: BoardCoord) => {
  executeMove(from, to, currentPlayer.value);
  selectedPiece.value = null;
  validMoves.value = [];
};

const handleClickCell = (coord: BoardCoord) => {
  // 如果已经有选中棋子且点击的是合法目标，则移动
  if (selectedPiece.value) {
    const isLegal = validMoves.value?.some(m => m.col === coord.col && m.row === coord.row) ?? false;
    if (isLegal) {
      handleMovePiece(selectedPiece.value, coord);
      return;
    }
  }
  // 否则清空选中
  selectedPiece.value = null;
  validMoves.value = [];
};

const undo = () => {
  if (moveHistory.value.length === 0) return;

  terminateWorker();
  winner.value = undefined;
  gameStatus.value = GameStatus.NOT_STARTED;
  winningLine.value = [];
  hintMove.value = null;

  if (mode.value === 'pvp' || isAnalysisMode.value) {
    const lastMove = moveHistory.value.pop();
    if (lastMove) {
      // 撤销移动：将棋子移回原位
      board.value = boardMovePiece(board.value, lastMove.to, lastMove.from);
      // 如果有被吃掉的棋子，恢复
      if (lastMove.capturedPiece) {
        // 在目标位置恢复被吃掉的棋子
        board.value[lastMove.to.row][lastMove.to.col] = {
          type: lastMove.capturedPiece.type,
          side: lastMove.capturedPiece.side,
          coord: { ...lastMove.to }
        };
      }
      currentPlayer.value = lastMove.side;
    }
  } else {
    // PvE模式：撤销AI和玩家各一步
    const lastMove = moveHistory.value.pop();
    if (lastMove) {
      board.value = boardMovePiece(board.value, lastMove.to, lastMove.from);
      // 如果有被吃掉的棋子，恢复
      if (lastMove.capturedPiece) {
        board.value[lastMove.to.row][lastMove.to.col] = {
          type: lastMove.capturedPiece.type,
          side: lastMove.capturedPiece.side,
          coord: { ...lastMove.to }
        };
      }
      currentPlayer.value = lastMove.side;
    }
    if (currentPlayer.value === aiPlayer.value) {
      if (moveHistory.value.length > 0) {
        const prevMove = moveHistory.value.pop();
        if (prevMove) {
          board.value = boardMovePiece(board.value, prevMove.to, prevMove.from);
          // 如果有被吃掉的棋子，恢复
          if (prevMove.capturedPiece) {
            board.value[prevMove.to.row][prevMove.to.col] = {
              type: prevMove.capturedPiece.type,
              side: prevMove.capturedPiece.side,
              coord: { ...prevMove.to }
            };
          }
          currentPlayer.value = prevMove.side;
        }
      } else {
        aiMove();
      }
    }
  }
};

const showHint = () => {
  if (winner.value !== undefined || isAiThinking.value) return;
  if (mode.value === 'pve' && currentPlayer.value === aiPlayer.value && !isAnalysisMode.value) return;

  terminateWorker();
  isAiThinking.value = true;
  worker = new Worker(new URL('../ai/aiWorker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    if (e.data.type === 'thinking') {
      if (showThinking.value) {
        thinkingPath.value = e.data.path;
      }
    } else if (e.data.type === 'result') {
      isAiThinking.value = false;
      thinkingPath.value = [];
      if (e.data.move) {
        hintMove.value = e.data.move;
      }
    }
  };

  worker.postMessage({
    board: board.value.map(row => [...row]),
    aiPlayer: currentPlayer.value,
    difficulty: aiDifficulty.value
  });
};
</script>

<template>
  <div :class="currentTheme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-800'" class="min-h-screen flex flex-col items-center py-8 font-sans transition-colors duration-300 relative">
    <!-- Notification -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform -translate-y-4 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform -translate-y-4 opacity-0"
    >
      <div v-if="showNotification" class="fixed top-4 z-50 px-6 py-2 rounded-full shadow-lg bg-emerald-500 text-white font-medium">
        {{ notificationMessage }}
      </div>
    </Transition>
    <h1 class="text-4xl font-bold mb-6 tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">{{ t('chineseChessTitle') }}</h1>

    <GameControls
      :mode="mode"
      :currentPlayer="currentPlayer"
      :winner="winner"
      :moveHistoryLength="moveHistory.length"
      :aiDifficulty="aiDifficulty"
      :aiRole="aiRole"
      :isAnalysisMode="isAnalysisMode"
      :showThinking="showThinking"
      :showSteps="showSteps"
      :isAiThinking="isAiThinking"
      :theme="theme"
      @setMode="setMode"
      @setAiDifficulty="setAiDifficulty"
      @setAiRole="setAiRole"
      @showHint="showHint"
      @undo="undo"
      @resetGame="resetGame"
      @toggleAnalysisMode="toggleAnalysisMode"
      @toggleThinking="toggleThinking"
      @toggleSteps="showSteps = !showSteps"
      @saveGame="openSaveModal"
      @showRecords="openRecordsModal"
      @updateTheme="settings.setChessTheme"
    />

    <div class="flex flex-col lg:flex-row items-start justify-center w-full px-4 gap-4 sm:gap-6 lg:gap-8">
      <!-- Left Spacer to balance the History Panel and keep Board centered -->
      <div class="hidden lg:block w-64 shrink-0"></div>

      <div class="flex justify-center shrink-0">
        <Board
          :board="board"
          :currentPlayer="currentPlayer"
          :winner="winner"
          :mode="mode"
          :hintMove="hintMove"
          :moveHistory="moveHistory"
          :winningLine="winningLine"
          :aiPlayer="aiPlayer"
          :isAnalysisMode="isAnalysisMode"
          :thinkingPath="thinkingPath"
          :showSteps="showSteps"
          :selectedPiece="selectedPiece"
          :validMoves="validMoves"
          :theme="theme"
          @selectPiece="handleSelectPiece"
          @movePiece="handleMovePiece"
          @clickCell="handleClickCell"
        />
      </div>

      <div class="w-full lg:w-64 shrink-0 flex flex-col justify-start gap-4 self-stretch h-[320px] sm:h-[400px] lg:h-[694px]">
        <div class="text-lg sm:text-xl font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-sm border text-center w-full transition-colors shrink-0"
             :class="[
               currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-white border-stone-200 text-stone-700',
               isAnalysisMode ? (currentTheme === 'dark' ? 'ring-2 ring-indigo-500 text-indigo-300' : 'ring-2 ring-indigo-400 text-indigo-700') : ''
             ]">
          {{ statusText }}
        </div>
        <ChineseChessHistoryPanel :moveHistory="moveHistory" @copySuccess="handleCopySuccess" />
      </div>
    </div>

    <div class="mt-4 sm:mt-6 lg:mt-8 text-xs sm:text-sm max-w-md px-4 text-center transition-colors" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
      <p>{{ t('chineseChessRules') }}</p>
      <p v-if="mode === 'pve'" class="mt-1">
        {{ t('currentModePve', aiRoleText, aiDifficultyText) }}
      </p>
    </div>

    <!-- Save Game Modal -->
    <div v-if="isSaveModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-sm p-6 rounded-2xl shadow-xl transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold">{{ t('saveGame') }}</h3>
          <button @click="closeSaveModal" class="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="mb-6">
          <label class="block text-sm font-medium mb-2" :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-700'">{{ t('saveNamePrompt') }}</label>
          <input
            v-model="saveName"
            type="text"
            :placeholder="t('saveNamePlaceholder')"
            class="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            :class="[
              currentTheme === 'dark' ? 'bg-stone-900 border-stone-700 text-stone-100' : 'bg-stone-50 border-stone-300 text-stone-900',
              saveNameError ? 'border-red-500 focus:ring-red-500' : ''
            ]"
            @keyup.enter="saveCurrentGame"
            @input="saveNameError = ''"
          />
          <p v-if="saveNameError" class="mt-2 text-sm text-red-500">{{ saveNameError }}</p>
        </div>
        <div class="flex justify-end gap-3">
          <button @click="closeSaveModal" class="px-4 py-2 rounded-lg font-medium transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'">
            {{ t('cancel') }}
          </button>
          <button @click="saveCurrentGame" class="px-4 py-2 rounded-lg font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors">
            {{ t('save') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Game Records Modal -->
    <div v-if="isRecordsModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-lg p-6 rounded-2xl shadow-xl transition-colors flex flex-col max-h-[80vh]" :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'">
        <div class="flex justify-between items-center mb-4 shrink-0">
          <h3 class="text-xl font-bold">{{ t('gameRecords') }}</h3>
          <button @click="closeRecordsModal" class="p-1 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
            <X class="w-5 h-5" />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
          <div v-if="gameRecords.length === 0" class="text-center py-8 opacity-50">
            {{ t('noRecords') }}
          </div>
          <div v-else class="flex flex-col gap-3">
            <div v-for="game in gameRecords" :key="game.id" class="flex items-center justify-between p-3 rounded-xl border transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-900/50 border-stone-700' : 'bg-stone-50 border-stone-200'">
              <div class="flex flex-col overflow-hidden pr-4 flex-1">
                <div v-if="editingGameId === game.id" class="flex items-center gap-2">
                  <input
                    v-model="editingName"
                    type="text"
                    class="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-600 text-stone-100' : 'bg-white border-stone-300 text-stone-900'"
                    @keyup.enter="saveEdit"
                    @keyup.esc="cancelEditing"
                    @blur="saveEdit"
                    v-focus
                  />
                </div>
                <div v-else class="flex items-center gap-2">
                  <span @click="canEditGame(game) ? startEditing(game) : null" class="font-semibold truncate transition-colors" :class="canEditGame(game) ? 'cursor-pointer hover:text-indigo-500' : 'cursor-default text-stone-500 dark:text-stone-400'" :title="canEditGame(game) ? t('edit') : ''">{{ game.name }}</span>
                  <span class="shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded" :class="game.isPublic ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400' : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400'">
                    {{ game.isPublic ? t('publicGame') : t('privateGame') }}
                  </span>
                </div>
                <span class="text-xs opacity-60">{{ new Date(game.timestamp).toLocaleString() }} - {{ t('totalMoves', game.moveCount) }} - {{ t('recordAuthor', game.author) }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button v-if="currentRecordId === game.id && canEditGame(game)" @click="updateGame(game.id)" class="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/80 transition-colors" :title="t('update')">
                  <RefreshCw class="w-4 h-4" />
                </button>
                <button @click="importGame(game)" class="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/80 transition-colors" :title="t('analysisMode')">
                  <Download class="w-4 h-4" />
                </button>
                <button v-if="canEditGame(game)" @click="deleteGame(game.id)" class="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/80 transition-colors" :title="t('confirmDelete')">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="gameToDelete" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-sm p-6 rounded-2xl shadow-xl transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100' : 'bg-white text-stone-800'">
        <h3 class="text-lg font-bold mb-4">{{ t('confirmDelete') }}</h3>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="cancelDeleteGame" class="px-4 py-2 rounded-lg font-medium transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'">
            {{ t('cancel') }}
          </button>
          <button @click="confirmDeleteGame" class="px-4 py-2 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition-colors">
            {{ t('confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>