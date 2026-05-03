<script setup lang="ts">
import { ref, computed } from 'vue';
import { Undo2, Flag, RotateCcw } from 'lucide-vue-next';
import Board from '../../games/chinese-chess/components/Board.vue';
import {
  PlayerSide,
  GameStatus,
  type BoardState,
  type BoardCoord,
  type MoveHistory,
  type GameState,
} from '../../games/chinese-chess/types';
import {
  validateMove,
  evaluateMoveResult,
  getPieceLegalMoves,
} from '../../games/chinese-chess/gameLogic';
import {
  createInitialBoard,
  movePiece as boardMovePiece,
  getPieceAt,
} from '../../games/chinese-chess/boardState';
import { convertBoardStateToCodes } from '../../games/chinese-chess/utils';
import { moveToDisplayNotation } from '../../games/chinese-chess/notation';
import { t, currentTheme, type MessageKey } from '../../i18n';
import { useGlobalSettings } from '../../composables/useSettings';

defineOptions({ name: 'AgentChessPanel' });

const props = withDefaults(defineProps<{
  playerSide?: 'red' | 'black';
}>(), {
  playerSide: 'red',
});

const emit = defineEmits<{
  (e: 'userMove', move: { from: BoardCoord; to: BoardCoord; notation: string }): void;
  (e: 'aiMove', move: { from: BoardCoord; to: BoardCoord; notation: string }): void;
  (e: 'gameOver', result: { winner: 'red' | 'black' | 'draw'; reason: string }): void;
  (e: 'aiFirstMove'): void;
}>();

const settings = useGlobalSettings();
const theme = computed(() => settings.chessTheme.value);

const aiFirst = ref(false);

const effectivePlayerSide = computed(() =>
  aiFirst.value ? 'black' : props.playerSide
);

const playerSideEnum = computed(() =>
  effectivePlayerSide.value === 'red' ? PlayerSide.RED : PlayerSide.BLACK
);
const aiSideEnum = computed(() =>
  effectivePlayerSide.value === 'red' ? PlayerSide.BLACK : PlayerSide.RED
);

const board = ref<BoardState>(createInitialBoard());
const currentPlayer = ref<PlayerSide>(PlayerSide.RED);
const winner = ref<PlayerSide | undefined>(undefined);
const gameStatus = ref<GameStatus>(GameStatus.NOT_STARTED);
const moveHistory = ref<MoveHistory[]>([]);
const selectedPiece = ref<BoardCoord | null>(null);
const validMovesForSelected = ref<BoardCoord[]>([]);
const showSteps = ref(true);

const isPlayerTurn = computed(() => currentPlayer.value === playerSideEnum.value);

const isGameOverState = computed(() =>
  gameStatus.value === GameStatus.CHECKMATE ||
  gameStatus.value === GameStatus.STALEMATE ||
  gameStatus.value === GameStatus.RESIGNED ||
  gameStatus.value === GameStatus.DRAW
);

const canToggleAiFirst = computed(() =>
  moveHistory.value.length === 0 && !isGameOverState.value && gameStatus.value === GameStatus.NOT_STARTED
);

const roundNumber = computed(() => Math.floor(moveHistory.value.length / 2) + 1);

const statusText = computed(() => {
  if (gameStatus.value === GameStatus.CHECKMATE || gameStatus.value === GameStatus.RESIGNED) {
    return winner.value === PlayerSide.RED ? t('statusRedWin') : t('statusBlackWin');
  }
  if (gameStatus.value === GameStatus.STALEMATE) {
    return t('statusStalemate');
  }
  if (!isPlayerTurn.value) {
    return t('chessAiThinkingStatus');
  }
  return currentPlayer.value === PlayerSide.RED ? t('statusRedTurn') : t('statusBlackTurn');
});

const buildGameState = (): GameState => ({
  board: board.value,
  currentPlayer: currentPlayer.value,
  status: gameStatus.value,
  moveHistory: moveHistory.value,
  config: { mode: 'pve', difficulty: 'expert' },
});

interface MoveExecutionResult {
  notation: string;
  moveResult: { capture: boolean; check: boolean; checkmate: boolean; stalemate: boolean; gameOver: boolean };
}

const executeMoveInternal = (
  from: BoardCoord,
  to: BoardCoord,
  side: PlayerSide,
): MoveExecutionResult | null => {
  const validation = validateMove(board.value, from, to, side);
  if (!validation.isValid) return null;

  const targetPiece = getPieceAt(board.value, to);
  const capturedPiece = targetPiece
    ? { type: targetPiece.type, side: targetPiece.side }
    : undefined;

  board.value = boardMovePiece(board.value, from, to);

  const movedPiece = getPieceAt(board.value, to)!;
  const moveRecord: MoveHistory = {
    from,
    to,
    piece: movedPiece.type,
    side,
    timestamp: Date.now(),
    capturedPiece,
  };
  moveHistory.value.push(moveRecord);

  const notation = moveToDisplayNotation(moveRecord, (key) => t(key as MessageKey));
  const result = evaluateMoveResult(board.value, side, !!capturedPiece);

  if (result.gameOver) {
    if (result.checkmate) {
      gameStatus.value = GameStatus.CHECKMATE;
      winner.value = side;
    } else if (result.stalemate) {
      gameStatus.value = GameStatus.STALEMATE;
      winner.value = side;
    }
  } else if (result.check) {
    gameStatus.value = GameStatus.CHECK;
  } else {
    gameStatus.value = GameStatus.IN_PROGRESS;
  }

  currentPlayer.value = side === PlayerSide.RED ? PlayerSide.BLACK : PlayerSide.RED;
  selectedPiece.value = null;
  validMovesForSelected.value = [];

  return { notation, moveResult: result };
};

const emitGameOver = () => {
  const winnerStr = winner.value === PlayerSide.RED ? 'red'
    : winner.value === PlayerSide.BLACK ? 'black'
    : 'draw';
  const reason = gameStatus.value === GameStatus.CHECKMATE ? 'checkmate'
    : gameStatus.value === GameStatus.STALEMATE ? 'stalemate'
    : gameStatus.value === GameStatus.RESIGNED ? 'resign'
    : 'draw';
  emit('gameOver', { winner: winnerStr, reason });
};

const handleSelectPiece = (coord: BoardCoord | null) => {
  if (!isPlayerTurn.value || isGameOverState.value) {
    selectedPiece.value = null;
    validMovesForSelected.value = [];
    return;
  }
  selectedPiece.value = coord;
  if (coord) {
    const gameState = buildGameState();
    validMovesForSelected.value = getPieceLegalMoves(gameState, coord);
  } else {
    validMovesForSelected.value = [];
  }
};

const handleMovePiece = (from: BoardCoord, to: BoardCoord) => {
  if (!isPlayerTurn.value || isGameOverState.value) return;

  const result = executeMoveInternal(from, to, playerSideEnum.value);
  if (!result) return;

  if (isGameOverState.value) {
    emitGameOver();
  } else {
    emit('userMove', { from, to, notation: result.notation });
  }
};

const placeAiPiece = (from: BoardCoord, to: BoardCoord): { check: boolean; gameOver: boolean } | null => {
  if (isGameOverState.value) return null;

  const result = executeMoveInternal(from, to, aiSideEnum.value);
  if (!result) return null;

  if (isGameOverState.value) {
    emitGameOver();
  } else {
    emit('aiMove', { from, to, notation: result.notation });
  }

  return { check: result.moveResult.check, gameOver: result.moveResult.gameOver };
};

const getBoard = (): number[][] => convertBoardStateToCodes(board.value);

const getMoveHistory = (): MoveHistory[] => moveHistory.value;

const isValidMove = (from: BoardCoord, to: BoardCoord): boolean => {
  const validation = validateMove(board.value, from, to, currentPlayer.value);
  return validation.isValid;
};

const getCurrentPlayer = (): 'red' | 'black' =>
  currentPlayer.value === PlayerSide.RED ? 'red' : 'black';

const resetGame = (): void => {
  board.value = createInitialBoard();
  currentPlayer.value = PlayerSide.RED;
  winner.value = undefined;
  gameStatus.value = GameStatus.NOT_STARTED;
  moveHistory.value = [];
  selectedPiece.value = null;
  validMovesForSelected.value = [];
  aiFirst.value = false;
};

const undoLastMove = (): void => {
  if (moveHistory.value.length === 0 || isGameOverState.value) return;

  const restoreMove = (move: MoveHistory) => {
    board.value = boardMovePiece(board.value, move.to, move.from);
    if (move.capturedPiece) {
      board.value[move.to.row][move.to.col] = {
        type: move.capturedPiece.type,
        side: move.capturedPiece.side,
        coord: { ...move.to },
      };
    }
    currentPlayer.value = move.side;
  };

  if (isPlayerTurn.value && moveHistory.value.length >= 2) {
    const aiMoveRecord = moveHistory.value.pop()!;
    restoreMove(aiMoveRecord);
    const playerMoveRecord = moveHistory.value.pop()!;
    restoreMove(playerMoveRecord);
  } else if (moveHistory.value.length >= 1) {
    const lastMove = moveHistory.value.pop()!;
    restoreMove(lastMove);
  }

  gameStatus.value = GameStatus.IN_PROGRESS;
  winner.value = undefined;
  selectedPiece.value = null;
  validMovesForSelected.value = [];
};

const resign = (): void => {
  if (isGameOverState.value) return;
  gameStatus.value = GameStatus.RESIGNED;
  winner.value = aiSideEnum.value;
  emitGameOver();
};

const toggleAiFirst = () => {
  if (!canToggleAiFirst.value) return;
  aiFirst.value = !aiFirst.value;
  if (aiFirst.value) {
    emit('aiFirstMove');
  }
};

const placeUserPieceFromChat = (from: BoardCoord, to: BoardCoord): boolean => {
  if (!isPlayerTurn.value || isGameOverState.value) return false;

  const result = executeMoveInternal(from, to, playerSideEnum.value);
  if (!result) return false;

  if (isGameOverState.value) {
    emitGameOver();
  } else {
    emit('userMove', { from, to, notation: result.notation });
  }
  return true;
};

defineExpose({
  placeAiPiece,
  getBoard,
  getMoveHistory,
  isValidMove,
  getCurrentPlayer,
  resetGame,
  undoLastMove,
  placeUserPieceFromChat,
});
</script>

<template>
  <div class="flex flex-col h-full w-full">
    <div class="flex items-center justify-between px-4 py-2 border-b shrink-0"
         :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
      <div class="flex items-center gap-4">
        <span class="text-sm font-medium"
              :class="currentTheme === 'dark' ? 'text-stone-300' : 'text-stone-600'">
          {{ statusText }}
        </span>
        <span class="text-xs"
              :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'">
          #{{ roundNumber }}
        </span>
        <div class="flex items-center gap-2 px-2 py-1 rounded-md"
             :class="currentTheme === 'dark' ? 'bg-stone-700/50' : 'bg-stone-100'">
          <span class="text-xs"
                :class="[
                  currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500',
                  !aiFirst && canToggleAiFirst ? 'font-medium' : ''
                ]">
            {{ t('agentAiSecond') }}
          </span>
          <button
            @click="toggleAiFirst"
            :disabled="!canToggleAiFirst"
            class="relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
            :class="[
              aiFirst ? 'bg-indigo-600' : (currentTheme === 'dark' ? 'bg-stone-600' : 'bg-stone-300'),
              !canToggleAiFirst ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
            ]"
          >
            <span
              class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-transform duration-200"
              :class="[aiFirst ? 'translate-x-4 bg-white' : 'bg-white']"
            ></span>
          </button>
          <span class="text-xs"
                :class="[
                  currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500',
                  aiFirst && canToggleAiFirst ? 'font-medium' : ''
                ]">
            {{ t('agentAiFirst') }}
          </span>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          @click="undoLastMove"
          :disabled="moveHistory.length < 2 || isGameOverState"
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentTheme === 'dark'
            ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600'
            : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'"
        >
          <Undo2 class="w-3.5 h-3.5" />
          {{ t('undo') }}
        </button>
        <button
          @click="resetGame"
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors"
          :class="currentTheme === 'dark'
            ? 'bg-stone-700 border-stone-600 text-stone-300 hover:bg-stone-600'
            : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'"
        >
          <RotateCcw class="w-3.5 h-3.5" />
          {{ t('chessNewGame') }}
        </button>
        <button
          @click="resign"
          :disabled="isGameOverState"
          class="flex items-center gap-1 px-2 py-1 text-xs rounded-md border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          :class="currentTheme === 'dark'
            ? 'bg-red-900/50 border-red-800 text-red-400 hover:bg-red-900/70'
            : 'bg-red-100 border-red-300 text-red-600 hover:bg-red-200'"
        >
          <Flag class="w-3.5 h-3.5" />
          {{ t('chessResignGame') }}
        </button>
      </div>
    </div>

    <div class="flex-1 flex items-center justify-center overflow-auto p-4">
      <Board
        :board="board"
        :currentPlayer="currentPlayer"
        :winner="winner"
        :mode="'pve'"
        :moveHistory="moveHistory"
        :aiPlayer="aiSideEnum"
        :showSteps="showSteps"
        :selectedPiece="selectedPiece"
        :validMoves="validMovesForSelected"
        :theme="theme"
        :flipped="aiFirst"
        @selectPiece="handleSelectPiece"
        @movePiece="handleMovePiece"
      />
    </div>
  </div>
</template>
