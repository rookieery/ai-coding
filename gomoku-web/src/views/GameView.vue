<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, onActivated, onDeactivated } from 'vue';
import { Download, Trash2, X, RefreshCw } from 'lucide-vue-next';
import { BOARD_SIZE, EMPTY, BLACK, WHITE, checkWin, checkDraw, type Difficulty, type RuleMode, getForbiddenType } from '../gameLogic';
import Board from '../components/Board.vue';
import HistoryPanel from '../components/HistoryPanel.vue';
import GameControls from '../components/GameControls.vue';
import { t, currentTheme } from '../i18n';
import { gameApi, type FrontendGame } from '../api/game-api';

defineOptions({
  name: 'GameView'
});

const board = ref<number[][]>(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY)));
const currentPlayer = ref<number>(BLACK);
const winner = ref<number>(EMPTY);
const mode = ref<'pvp' | 'pve'>('pvp');
const aiDifficulty = ref<Difficulty>('expert');
const aiRole = ref<'first' | 'second'>('second');
const ruleMode = ref<RuleMode>('standard');
const isAnalysisMode = ref<boolean>(false);
const showThinking = ref<boolean>(false);
const showSteps = ref<boolean>(false);
const thinkingPath = ref<{r: number, c: number, player: number}[]>([]);
const currentRecordId = ref<string | null>(null);
const isAiThinking = ref<boolean>(false);

type SavedGame = FrontendGame & { moveCount?: number };

const isSaveModalOpen = ref(false);
const isRecordsModalOpen = ref(false);
const saveName = ref('');
const savedGames = ref<SavedGame[]>([]);

onMounted(async () => {
  try {
    // 尝试从API加载游戏
    console.log('Loading games from API...');
    const result = await gameApi.getGames();
    savedGames.value = result.games.map(game => {
      // 获取完整的游戏数据（如果需要）
      // 目前使用简化的游戏信息
      return {
        id: game.id,
        name: game.name,
        board: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY)),
        moveHistory: [], // 简化的游戏列表不包含移动历史
        moveCount: game.moveCount, // 保存步数信息用于显示
        timestamp: game.timestamp,
        mode: game.mode === 'pve' ? 'pve' : 'pvp',
        aiDifficulty: game.aiDifficulty as Difficulty,
        aiRole: 'second' as const,
        ruleMode: 'standard' as const,
      };
    });
    console.log(`Loaded ${savedGames.value.length} games from API`);
  } catch (error) {
    console.error('Failed to load games from API, falling back to localStorage:', error);

    // 回退到localStorage
    const stored = localStorage.getItem('gomoku_saved_games');
    if (stored) {
      try {
        savedGames.value = JSON.parse(stored);
        console.log(`Loaded ${savedGames.value.length} games from localStorage`);
      } catch (e) {
        console.error('Failed to parse saved games from localStorage', e);
      }
    }
  }

  // 可选：创建默认示例棋谱（只在第一次访问时）
  // 如果需要，可以提供一个"创建示例棋谱"按钮而不是自动创建
  const shouldCreateDefault = localStorage.getItem('gomoku_default_created') !== 'true';
  const puyueName = "浦月必胜开局1";

  if (shouldCreateDefault) {
    const puyueHistory = [
      { r: 7, c: 7, player: BLACK },
      { r: 6, c: 8, player: WHITE },
      { r: 8, c: 8, player: BLACK },
      { r: 6, c: 6, player: WHITE },
      { r: 8, c: 6, player: BLACK } // g9
    ];

    const existingIndex = savedGames.value.findIndex(g => g.name === puyueName);
    if (existingIndex === -1) {
      const puyueGame: SavedGame = {
        id: `puyue_${Date.now()}`, // 使用时间戳避免ID冲突
        name: puyueName,
        board: Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY)),
        moveHistory: puyueHistory,
        moveCount: puyueHistory.length,
        timestamp: Date.now(),
        mode: 'pve',
        aiDifficulty: 'expert',
        aiRole: 'second',
        ruleMode: 'renju'
      };
      // Fill the board for the saved game
      puyueHistory.forEach(m => {
        puyueGame.board[m.r][m.c] = m.player;
      });
      savedGames.value.unshift(puyueGame);

      // 尝试保存到API
      try {
        await gameApi.saveGame(puyueGame);
        console.log('Puyue opening saved to API');
        localStorage.setItem('gomoku_default_created', 'true');
      } catch (error) {
        console.error('Failed to save puyue opening to API, saving to localStorage:', error);
        localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
        localStorage.setItem('gomoku_default_created', 'true');
      }
    } else {
      // 如果已经存在同名棋谱，也标记为已创建
      localStorage.setItem('gomoku_default_created', 'true');
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

const saveCurrentGame = async () => {
  if (!saveName.value.trim()) return;

  if (savedGames.value.some(g => g.name === saveName.value.trim())) {
    saveNameError.value = t('nameExists');
    return;
  }

  saveNameError.value = '';

  const newGame: SavedGame = {
    id: Date.now().toString(), // 临时ID，会被API返回的ID覆盖
    name: saveName.value.trim(),
    board: board.value.map(row => [...row]),
    moveHistory: [...moveHistory.value],
    moveCount: moveHistory.value.length,
    timestamp: Date.now(),
    mode: mode.value,
    aiDifficulty: aiDifficulty.value,
    aiRole: aiRole.value,
    ruleMode: ruleMode.value
  };

  try {
    // 保存到API
    const savedGame = await gameApi.saveGame(newGame);

    // 使用API返回的ID更新游戏
    newGame.id = savedGame.id;
    newGame.timestamp = savedGame.timestamp;

    savedGames.value.push(newGame);
    localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
    currentRecordId.value = newGame.id;

    closeSaveModal();
    notify(t('saveSuccess'));
  } catch (error) {
    console.error('Failed to save game to API:', error);
    // 回退到localStorage
    savedGames.value.push(newGame);
    localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
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

  // 如果游戏没有移动历史或棋盘为空，尝试从API获取完整数据
  // 注意：列表中的游戏可能只有moveCount而没有完整的moveHistory
  if ((game.moveCount && game.moveCount > 0 && game.moveHistory.length === 0) ||
      game.board.every(row => row.every(cell => cell === EMPTY))) {
    try {
      console.log('Fetching full game data from API for:', game.id);
      fullGame = await gameApi.getGame(game.id);
      console.log('Full game data loaded:', fullGame);
    } catch (error) {
      console.error('Failed to fetch full game data from API:', error);
      // 继续使用现有的游戏数据
    }
  }

  board.value = fullGame.board.map(row => [...row]);
  moveHistory.value = [...fullGame.moveHistory];
  mode.value = 'pve';
  aiDifficulty.value = fullGame.aiDifficulty;
  aiRole.value = fullGame.aiRole;
  ruleMode.value = fullGame.ruleMode;
  currentRecordId.value = fullGame.id;

  currentPlayer.value = fullGame.moveHistory.length % 2 === 0 ? BLACK : WHITE;

  winner.value = EMPTY;
  winningLine.value = [];
  if (fullGame.moveHistory.length > 0) {
    const lastMove = fullGame.moveHistory[fullGame.moveHistory.length - 1];
    const winLine = checkWin(board.value, lastMove.r, lastMove.c, lastMove.player, ruleMode.value);
    if (winLine) {
      winner.value = lastMove.player;
      winningLine.value = winLine;
    } else if (checkDraw(board.value)) {
      winner.value = 3;
    }
  }

  isAnalysisMode.value = true;

  closeRecordsModal();
  notify(t('importSuccess'));
};

const gameToDelete = ref<string | null>(null);
const editingGameId = ref<string | null>(null);
const editingName = ref('');

const startEditing = (game: SavedGame) => {
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
    const updatedGame = { ...game, name };

    try {
      // 尝试更新到API
      await gameApi.updateGame(game.id, updatedGame);
      savedGames.value[index] = updatedGame;
      notify(t('updateSuccess'));
    } catch (error) {
      console.error('Failed to update game name in API:', error);
      // 回退到localStorage
      savedGames.value[index].name = name;
      localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
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
    const updatedGame = {
      ...savedGames.value[index],
      board: board.value.map(row => [...row]),
      moveHistory: [...moveHistory.value],
      moveCount: moveHistory.value.length,
      timestamp: Date.now()
    };

    try {
      // 尝试更新到API
      await gameApi.updateGame(id, updatedGame);
      savedGames.value[index] = updatedGame;
      localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
      notify(t('updateSuccess'));
    } catch (error) {
      console.error('Failed to update game in API:', error);
      // 回退到localStorage
      savedGames.value[index] = updatedGame;
      localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
      notify(`${t('updateSuccess')} (local storage)`);
    }
  }
};

const deleteGame = (id: string) => {
  gameToDelete.value = id;
};

const confirmDeleteGame = async () => {
  if (gameToDelete.value) {
    const gameId = gameToDelete.value;

    try {
      // 尝试从API删除
      await gameApi.deleteGame(gameId);

      // 从本地列表删除
      if (currentRecordId.value === gameId) {
        currentRecordId.value = null;
      }
      savedGames.value = savedGames.value.filter(g => g.id !== gameId);
      localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
      notify(t('deleteSuccess'));
    } catch (error) {
      console.error('Failed to delete game from API:', error);
      // 回退到localStorage
      if (currentRecordId.value === gameId) {
        currentRecordId.value = null;
      }
      savedGames.value = savedGames.value.filter(g => g.id !== gameId);
      localStorage.setItem('gomoku_saved_games', JSON.stringify(savedGames.value));
      notify(`${t('deleteSuccess')} (local storage)`);
    }

    gameToDelete.value = null;
  }
};

const cancelDeleteGame = () => {
  gameToDelete.value = null;
};

const moveHistory = ref<{r: number, c: number, player: number}[]>([]);

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
  // 暂时不处理，由用户手动触发
});
const winningLine = ref<{r: number, c: number}[]>([]);
const hintMove = ref<{r: number, c: number} | null>(null);
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

const aiPlayer = computed(() => aiRole.value === 'first' ? BLACK : WHITE);

const statusText = computed(() => {
  if (winner.value === BLACK) return t('statusBlackWin');
  if (winner.value === WHITE) return t('statusWhiteWin');
  if (winner.value === 3) return t('statusDraw');
  
  const turnText = currentPlayer.value === BLACK ? t('statusBlackTurn') : t('statusWhiteTurn');
  const thinkingText = isAiThinking.value ? ` (${t('aiThinking')})` : '';
  
  if (isAnalysisMode.value) return `${t('analysisMode')} - ${turnText}${thinkingText}`;
  return `${turnText}${thinkingText}`;
});

const aiRoleText = computed(() => aiRole.value === 'first' ? t('black') : t('white'));
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
  if (winner.value !== EMPTY || mode.value !== 'pve' || isAnalysisMode.value) return;
  if (currentPlayer.value !== aiPlayer.value) return;

  terminateWorker();
  isAiThinking.value = true;
  worker = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (e) => {
    if (e.data.type === 'thinking') {
      if (showThinking.value) {
        thinkingPath.value = e.data.path;
      }
    } else if (e.data.type === 'result') {
      isAiThinking.value = false;
      thinkingPath.value = [];
      const move = e.data.move;
      if (move && currentPlayer.value === aiPlayer.value && winner.value === EMPTY && mode.value === 'pve' && !isAnalysisMode.value) {
        executeMove(move.r, move.c, aiPlayer.value);
      }
    }
  };

  worker.postMessage({
    board: board.value.map(row => [...row]),
    aiPlayer: aiPlayer.value,
    difficulty: aiDifficulty.value,
    ruleMode: ruleMode.value
  });
};

const resetGame = () => {
  terminateWorker();
  board.value = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
  currentPlayer.value = BLACK;
  winner.value = EMPTY;
  moveHistory.value = [];
  winningLine.value = [];
  hintMove.value = null;
  isAnalysisMode.value = false;
  currentRecordId.value = null;

  if (mode.value === 'pve' && aiPlayer.value === BLACK) {
    aiMove();
  }
};

const setMode = (newMode: 'pvp' | 'pve') => {
  mode.value = newMode;
  resetGame();
};

const setAiDifficulty = (diff: Difficulty) => {
  aiDifficulty.value = diff;
  resetGame();
};

const setAiRole = (role: 'first' | 'second') => {
  aiRole.value = role;
  resetGame();
};

const setRuleMode = (newRuleMode: RuleMode) => {
  ruleMode.value = newRuleMode;
};

const toggleAnalysisMode = () => {
  if (mode.value !== 'pve') return;
  terminateWorker();
  isAnalysisMode.value = !isAnalysisMode.value;
  if (!isAnalysisMode.value && currentPlayer.value === aiPlayer.value && winner.value === EMPTY) {
    aiMove();
  }
};

const toggleThinking = () => {
  showThinking.value = !showThinking.value;
  if (!showThinking.value) {
    thinkingPath.value = [];
  }
};

const executeMove = (r: number, c: number, player: number) => {
  board.value[r][c] = player;
  moveHistory.value.push({r, c, player});
  playSound();
  hintMove.value = null;

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
    aiMove();
  }
};

const placePiece = (r: number, c: number) => {
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

  executeMove(r, c, currentPlayer.value);
};

const undo = () => {
  if (moveHistory.value.length === 0) return;
  
  terminateWorker();
  
  winner.value = EMPTY;
  winningLine.value = [];
  hintMove.value = null;

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
        aiMove();
      }
    }
  }
};

const showHint = () => {
  if (winner.value !== EMPTY || isAiThinking.value) return;
  if (mode.value === 'pve' && currentPlayer.value === aiPlayer.value && !isAnalysisMode.value) return;

  terminateWorker();
  isAiThinking.value = true;
  worker = new Worker(new URL('./aiWorker.ts', import.meta.url), { type: 'module' });

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
    difficulty: aiDifficulty.value,
    ruleMode: ruleMode.value
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
    <h1 class="text-4xl font-bold mb-6 tracking-tight" :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'">{{ t('title') }}</h1>
    
    <GameControls
      :mode="mode"
      :currentPlayer="currentPlayer"
      :winner="winner"
      :moveHistoryLength="moveHistory.length"
      :aiDifficulty="aiDifficulty"
      :aiRole="aiRole"
      :ruleMode="ruleMode"
      :isAnalysisMode="isAnalysisMode"
      :showThinking="showThinking"
      :showSteps="showSteps"
      :isAiThinking="isAiThinking"
      @setMode="setMode"
      @setAiDifficulty="setAiDifficulty"
      @setAiRole="setAiRole"
      @setRuleMode="setRuleMode"
      @showHint="showHint"
      @undo="undo"
      @resetGame="resetGame"
      @toggleAnalysisMode="toggleAnalysisMode"
      @toggleThinking="toggleThinking"
      @toggleSteps="showSteps = !showSteps"
      @saveGame="openSaveModal"
      @showRecords="openRecordsModal"
    />

    <div class="flex flex-col lg:flex-row items-start justify-center w-full px-4 gap-6 lg:gap-8">
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
          :forbiddenPoints="forbiddenPoints"
          :showSteps="showSteps"
          @placePiece="placePiece"
        />
      </div>
      
      <div class="w-full lg:w-64 shrink-0 flex flex-col justify-start gap-4 self-stretch h-[482px] lg:h-[694px]">
        <div class="text-xl font-semibold px-6 py-3 rounded-lg shadow-sm border text-center w-full transition-colors shrink-0"
             :class="[
               currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-white border-stone-200 text-stone-700',
               isAnalysisMode ? (currentTheme === 'dark' ? 'ring-2 ring-indigo-500 text-indigo-300' : 'ring-2 ring-indigo-400 text-indigo-700') : ''
             ]">
          {{ statusText }}
        </div>
        <div class="flex-1 min-h-0 overflow-hidden">
          <HistoryPanel :moveHistory="moveHistory" @copySuccess="handleCopySuccess" />
        </div>
      </div>
    </div>
    
    <div class="mt-8 text-sm max-w-md text-center transition-colors" :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
      <p>{{ t('rules') }}</p>
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
                <span v-else @click="startEditing(game)" class="font-semibold truncate cursor-pointer hover:text-indigo-500 transition-colors" :title="t('edit')">{{ game.name }}</span>
                <span class="text-xs opacity-60">{{ new Date(game.timestamp).toLocaleString() }} - {{ t('totalMoves', game.moveCount || game.moveHistory.length) }}</span>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button v-if="currentRecordId === game.id" @click="updateGame(game.id)" class="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-400 dark:hover:bg-emerald-900/80 transition-colors" :title="t('update')">
                  <RefreshCw class="w-4 h-4" />
                </button>
                <button @click="importGame(game)" class="p-2 rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-400 dark:hover:bg-indigo-900/80 transition-colors" :title="t('analysisMode')">
                  <Download class="w-4 h-4" />
                </button>
                <button @click="deleteGame(game.id)" class="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/80 transition-colors" :title="t('confirmDelete')">
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
