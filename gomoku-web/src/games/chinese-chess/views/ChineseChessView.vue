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
} from '../gameLogic';
import { createInitialBoard, movePiece as boardMovePiece, getPieceAt } from '../boardState';
import Board from '../components/Board.vue';
import GameControls from '../components/GameControls.vue';
import ChineseChessHistoryPanel from '../components/HistoryPanel.vue';
import { t, currentTheme } from '../../../i18n';
import { gameApi, type FrontendGame } from '../../../api/game-api';
import { useGlobalAuth } from '../../../composables/useAuth';

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

// 获取认证信息
const auth = useGlobalAuth();

type SavedGame = FrontendGame & { moveCount?: number };

const isSaveModalOpen = ref(false);
const isRecordsModalOpen = ref(false);
const saveName = ref('');
const savedGames = ref<SavedGame[]>([]);

onMounted(async () => {
  try {
    // 尝试从API加载游戏
    const result = await gameApi.getGames();
    savedGames.value = result.games.map(game => ({
      id: game.id,
      name: game.name,
      board: createInitialBoard(), // 简化，实际应从游戏数据加载
      moveHistory: [],
      moveCount: game.moveCount,
      timestamp: game.timestamp,
      mode: game.mode === 'pve' ? 'pve' : 'pvp',
      aiDifficulty: game.aiDifficulty as Difficulty,
      aiRole: 'black' as const,
    }));
  } catch (error) {
    console.error('Failed to load games from API, falling back to localStorage:', error);
    // 回退到localStorage
    const stored = localStorage.getItem('chinese_chess_saved_games');
    if (stored) {
      try {
        savedGames.value = JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse saved games from localStorage', e);
      }
    }
  }
});

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
const canEditGame = (game: SavedGame) => {
  const isAdmin = auth.user.value?.role === 'ADMIN';
  return isAdmin || !game.isPublic;
};

const saveCurrentGame = async () => {
  if (!saveName.value.trim()) return;

  if (savedGames.value.some(g => g.name === saveName.value.trim())) {
    saveNameError.value = t('nameExists');
    return;
  }

  saveNameError.value = '';

  // 根据用户权限设置棋谱公开性：只有admin用户保存公开棋谱，其他用户默认私有
  const isUserAdmin = auth.user.value?.role === 'ADMIN';

  const newGame: SavedGame = {
    id: Date.now().toString(),
    name: saveName.value.trim(),
    board: board.value.map(row => [...row]),
    moveHistory: [...moveHistory.value],
    moveCount: moveHistory.value.length,
    timestamp: Date.now(),
    mode: mode.value,
    aiDifficulty: aiDifficulty.value,
    aiRole: aiRole.value,
    isPublic: isUserAdmin
  };

  try {
    // 保存到API
    const savedGame = await gameApi.saveGame(newGame);
    newGame.id = savedGame.id;
    newGame.timestamp = savedGame.timestamp;
    savedGames.value.push(newGame);
    localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
    currentRecordId.value = newGame.id;
    closeSaveModal();
    notify(t('saveSuccess'));
  } catch (error) {
    console.error('Failed to save game to API:', error);
    // 回退到localStorage
    savedGames.value.push(newGame);
    localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
    currentRecordId.value = newGame.id;
    closeSaveModal();
    notify(`${t('saveSuccess')} (local storage)`);
  }
};

const openRecordsModal = () => {
  isRecordsModalOpen.value = true;
};

const closeRecordsModal = () => {
  isRecordsModalOpen.value = false;
};

const importGame = async (game: SavedGame) => {
  terminateWorker();

  let fullGame = game;
  if ((game.moveCount && game.moveCount > 0 && game.moveHistory.length === 0) ||
      game.board.every(row => row.every(cell => cell === null))) {
    try {
      fullGame = await gameApi.getGame(game.id);
    } catch (error) {
      console.error('Failed to fetch full game data from API:', error);
    }
  }

  board.value = fullGame.board.map(row => [...row]);
  moveHistory.value = [...fullGame.moveHistory];
  mode.value = 'pve';
  aiDifficulty.value = fullGame.aiDifficulty;
  aiRole.value = fullGame.aiRole;
  currentRecordId.value = fullGame.id;

  currentPlayer.value = fullGame.moveHistory.length % 2 === 0 ? PlayerSide.RED : PlayerSide.BLACK;
  winner.value = undefined;
  gameStatus.value = GameStatus.NOT_STARTED;
  if (fullGame.moveHistory.length > 0) {
    // 评估游戏状态
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
};

const gameToDelete = ref<string | null>(null);
const editingGameId = ref<string | null>(null);
const editingName = ref('');

const startEditing = (game: SavedGame) => {
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

  const index = savedGames.value.findIndex(g => g.id === editingGameId.value);
  if (index !== -1) {
    const game = savedGames.value[index];
    if (!canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionEditPublic') : t('noPermissionEdit'));
      editingGameId.value = null;
      return;
    }

    const updatedGame = { ...game, name };
    try {
      await gameApi.updateGame(game.id, updatedGame);
      savedGames.value[index] = updatedGame;
      notify(t('updateSuccess'));
    } catch (error) {
      console.error('Failed to update game name in API:', error);
      savedGames.value[index].name = name;
      localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
      notify(`${t('updateSuccess')} (local storage)`);
    }
  }
  editingGameId.value = null;
};

const cancelEditing = () => {
  editingGameId.value = null;
};

const updateGame = async (id: string) => {
  const index = savedGames.value.findIndex(g => g.id === id);
  if (index !== -1) {
    const game = savedGames.value[index];
    if (!canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionUpdatePublic') : t('noPermissionUpdate'));
      return;
    }

    const updatedGame = {
      ...savedGames.value[index],
      board: board.value.map(row => [...row]),
      moveHistory: [...moveHistory.value],
      moveCount: moveHistory.value.length,
      timestamp: Date.now()
    };

    try {
      await gameApi.updateGame(id, updatedGame);
      savedGames.value[index] = updatedGame;
      localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
      notify(t('updateSuccess'));
    } catch (error) {
      console.error('Failed to update game in API:', error);
      savedGames.value[index] = updatedGame;
      localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
      notify(`${t('updateSuccess')} (local storage)`);
    }
  }
};

const deleteGame = (id: string) => {
  const game = savedGames.value.find(g => g.id === id);
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
    const game = savedGames.value.find(g => g.id === gameId);
    if (game && !canEditGame(game)) {
      notify(game.isPublic ? t('noPermissionDeletePublic') : t('noPermissionDelete'));
      gameToDelete.value = null;
      return;
    }

    try {
      await gameApi.deleteGame(gameId);
      if (currentRecordId.value === gameId) {
        currentRecordId.value = null;
      }
      savedGames.value = savedGames.value.filter(g => g.id !== gameId);
      localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
      notify(t('deleteSuccess'));
    } catch (error) {
      console.error('Failed to delete game from API:', error);
      if (currentRecordId.value === gameId) {
        currentRecordId.value = null;
      }
      savedGames.value = savedGames.value.filter(g => g.id !== gameId);
      localStorage.setItem('chinese_chess_saved_games', JSON.stringify(savedGames.value));
      notify(`${t('deleteSuccess')} (local storage)`);
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
  if (winner.value === PlayerSide.BLACK) return t('statusBlackWin');
  if (gameStatus.value === GameStatus.CHECKMATE) {
    return winner.value === PlayerSide.RED ? t('statusRedWin') : t('statusBlackWin');
  }
  if (gameStatus.value === GameStatus.STALEMATE) return t('statusStalemate');
  if (gameStatus.value === GameStatus.DRAW) return t('statusDraw');
  if (gameStatus.value === GameStatus.CHECK) return t('statusCheck');

  const turnText = currentPlayer.value === PlayerSide.RED ? t('statusRedTurn') : t('statusBlackTurn');
  const thinkingText = isAiThinking.value ? ` (${t('aiThinking')})` : '';

  if (isAnalysisMode.value) return `${t('analysisMode')} - ${turnText}${thinkingText}`;
  return `${turnText}${thinkingText}`;
});

const aiRoleText = computed(() => aiRole.value === 'red' ? t('red') : t('black'));
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
    const isLegal = validMoves.value.some(m => m.col === coord.col && m.row === coord.row);
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
          <div v-if="savedGames.length === 0" class="text-center py-8 opacity-50">
            {{ t('noRecords') }}
          </div>
          <div v-else class="flex flex-col gap-3">
            <div v-for="game in savedGames" :key="game.id" class="flex items-center justify-between p-3 rounded-xl border transition-colors" :class="currentTheme === 'dark' ? 'bg-stone-900/50 border-stone-700' : 'bg-stone-50 border-stone-200'">
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
                <span v-else @click="canEditGame(game) ? startEditing(game) : null" class="font-semibold truncate transition-colors" :class="canEditGame(game) ? 'cursor-pointer hover:text-indigo-500' : 'cursor-default text-stone-500 dark:text-stone-400'" :title="canEditGame(game) ? t('edit') : ''">{{ game.name }}</span>
                <span class="text-xs opacity-60">{{ new Date(game.timestamp).toLocaleString() }} - {{ t('totalMoves', game.moveCount || game.moveHistory.length) }}</span>
                <span class="text-xs mt-0.5" :class="game.isPublic ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-500 dark:text-stone-400'">
                  {{ game.isPublic ? t('publicGame') : t('privateGame') }}
                </span>
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