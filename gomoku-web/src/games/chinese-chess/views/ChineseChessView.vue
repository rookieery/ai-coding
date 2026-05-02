<script setup lang="ts">
import { computed, onUnmounted, onDeactivated, onMounted, onActivated, ref } from 'vue';
import html2canvas from 'html2canvas-pro';
import { t, currentTheme } from '../../../i18n';
import { type GameType, type GameListItem, type ChineseChessFrontendGame } from '../../../api/game-api';
import { type BoardCoord } from '../types';

import Board from '../components/Board.vue';
import GameControls from '../components/GameControls.vue';
import ChineseChessHistoryPanel from '../components/HistoryPanel.vue';
import SaveGameModal from '../components/SaveGameModal.vue';
import GameRecordsModal from '../components/GameRecordsModal.vue';
import DeleteConfirmModal from '../components/DeleteConfirmModal.vue';
import NotificationToast from '../components/NotificationToast.vue';

import { useGameState } from '../composables/useGameState';
import { useGameAI } from '../composables/useGameAI';
import { useGameRecords } from '../composables/useGameRecords';
import { useGameUI } from '../composables/useGameUI';
import { useGlobalSettings } from '../../../composables/useSettings';
import { useGlobalAuth } from '../../../composables/useAuth';
import { useVisionBridge } from '../../../composables/useVisionBridge';
import { PlayerSide } from '../types';

const GAME_TYPE: GameType = 'chinese_chess';

const boardRef = ref<InstanceType<typeof Board> | null>(null);
const visionConsumed = ref(false);

defineOptions({
  name: 'ChineseChessView'
});

const settings = useGlobalSettings();
const auth = useGlobalAuth();
const theme = computed(() => settings.chessTheme.value);

const gameState = useGameState();
const gameAI = useGameAI();
const gameRecords = useGameRecords(GAME_TYPE);
const gameUI = useGameUI();

const handleAiMove = (from: BoardCoord, to: BoardCoord) => {
  if (gameState.currentPlayer.value === gameState.aiPlayer.value &&
      gameState.winner.value === undefined &&
      gameState.mode.value === 'pve' &&
      !gameState.isAnalysisMode.value) {
    const result = gameState.executeMove(from, to, gameState.aiPlayer.value, gameUI.playSound, triggerAiMove);
    if (result.success) {
      gameAI.hintMove.value = null;
    }
  }
};

const triggerAiMove = () => {
  if (gameState.winner.value !== undefined || gameState.mode.value !== 'pve' || gameState.isAnalysisMode.value) return;
  if (gameState.currentPlayer.value !== gameState.aiPlayer.value) return;

  gameAI.aiMove(
    gameState.board.value,
    gameState.aiPlayer.value,
    gameState.aiDifficulty.value,
    handleAiMove
  );
};

const handleSelectPiece = (coord: BoardCoord | null) => {
  if (coord) {
    gameState.handleSelectPiece(coord);
  }
};

const handleMovePiece = (from: BoardCoord, to: BoardCoord) => {
  const result = gameState.executeMove(from, to, gameState.currentPlayer.value, gameUI.playSound, triggerAiMove);
  if (result.success) {
    gameAI.hintMove.value = null;
  } else if (result.reason) {
    gameUI.notify(`Invalid move: ${result.reason}`);
  }
  gameState.clearSelection();
};

const handleClickCell = (coord: BoardCoord) => {
  const { selectedPiece, validMoves } = gameState;
  if (selectedPiece.value) {
    const isLegal = validMoves.value?.some(m => m.col === coord.col && m.row === coord.row) ?? false;
    if (isLegal) {
      handleMovePiece(selectedPiece.value, coord);
      return;
    }
  }
  gameState.clearSelection();
};

const handleUndo = () => {
  gameState.undo(gameAI.terminateWorker, triggerAiMove);
};

const handleResetGame = () => {
  gameState.resetGame(gameAI.terminateWorker, triggerAiMove);
};

const handleSetMode = (newMode: 'pvp' | 'pve') => {
  gameState.setMode(newMode, gameAI.terminateWorker, triggerAiMove);
};

const handleSetAiDifficulty = (diff: 'beginner' | 'intermediate' | 'advanced' | 'expert') => {
  gameState.setAiDifficulty(diff, gameAI.terminateWorker, triggerAiMove);
};

const handleSetAiRole = (role: 'red' | 'black') => {
  gameState.setAiRole(role, gameAI.terminateWorker, triggerAiMove);
};

const handleToggleAnalysisMode = () => {
  gameState.toggleAnalysisMode(gameAI.terminateWorker, triggerAiMove);
};

const handleShowHint = () => {
  if (gameState.winner.value !== undefined || gameAI.isAiThinking.value) return;
  if (gameState.mode.value === 'pve' && gameState.currentPlayer.value === gameState.aiPlayer.value && !gameState.isAnalysisMode.value) return;

  gameAI.showHint(
    gameState.board.value,
    gameState.currentPlayer.value,
    gameState.aiDifficulty.value
  );
};

const handleSaveGame = async () => {
  if (!gameUI.saveName.value.trim()) return;

  if (gameRecords.gameRecords.value.some(g => g.name === gameUI.saveName.value.trim())) {
    gameUI.saveNameError.value = t('nameExists');
    return;
  }

  gameUI.saveNameError.value = '';

  const isUserAdmin = auth.user.value?.role === 'ADMIN';
  const newGame = gameState.toFrontendGame(gameUI.saveName.value, isUserAdmin, GAME_TYPE);

  const result = await gameRecords.saveGame(newGame, gameRecords.gameRecords.value);
  if (result) {
    gameState.currentRecordId.value = result.id;
    gameUI.closeSaveModal();
    gameUI.notify(t('saveSuccess'));
  } else {
    gameUI.notify(t('saveFailed'));
  }
};

const handleImportGame = async (gameListItem: GameListItem) => {
  const fullGame = await gameRecords.getFullGame(gameListItem.id);
  if (fullGame) {
    gameState.importGame(fullGame, gameAI.terminateWorker);
    gameUI.closeRecordsModal();
    gameUI.notify(t('importSuccess'));
  } else {
    gameUI.notify(t('importFailed'));
  }
};

const handleUpdateGame = async (id: string) => {
  const record = gameRecords.gameRecords.value.find(g => g.id === id);
  if (!record || !gameRecords.canEditGame(record)) {
    gameUI.notify(record?.isPublic ? t('noPermissionUpdatePublic') : t('noPermissionUpdate'));
    return;
  }

  const fullGame = await gameRecords.getFullGame(id);
  if (fullGame) {
    const updatedGame: ChineseChessFrontendGame = {
      ...fullGame,
      board: gameState.board.value.map(row => [...row]),
      moveHistory: [...gameState.moveHistory.value] as ChineseChessFrontendGame['moveHistory'],
    };
    const success = await gameRecords.updateGame(id, updatedGame);
    if (success) {
      gameUI.notify(t('updateSuccess'));
    } else {
      gameUI.notify(t('updateFailed'));
    }
  }
};

const handleDeleteGame = (id: string) => {
  const game = gameRecords.gameRecords.value.find(g => g.id === id);
  if (!game || !gameRecords.canEditGame(game)) {
    gameUI.notify(game?.isPublic ? t('noPermissionDeletePublic') : t('noPermissionDelete'));
    return;
  }
  gameUI.openDeleteConfirm(id);
};

const handleConfirmDelete = async () => {
  if (gameUI.gameToDelete.value) {
    const gameId = gameUI.gameToDelete.value;
    const success = await gameRecords.deleteGame(gameId);
    if (success) {
      if (gameState.currentRecordId.value === gameId) {
        gameState.currentRecordId.value = null;
      }
      gameUI.notify(t('deleteSuccess'));
    } else {
      gameUI.notify(t('deleteFailed'));
    }
    gameUI.closeDeleteConfirm();
  }
};

const handleExportBoard = async () => {
  const el = boardRef.value?.$el as HTMLElement | undefined;
  if (!el) {
    gameUI.notify(t('exportFailed'));
    return;
  }

  try {
    const canvas = await html2canvas(el, {
      backgroundColor: null,
      scale: 2,
    });

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
    link.download = `chinese-chess-${timestamp}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    gameUI.notify(t('exportSuccess'));
  } catch {
    gameUI.notify(t('exportFailed'));
  }
};

const handleOpenRecords = async () => {
  await gameRecords.fetchRecords();
  gameUI.openRecordsModal();
};

const handleStartEdit = (game: GameListItem) => {
  gameRecords.startEditing(game, gameUI.notify);
};

const handleSaveEdit = async () => {
  await gameRecords.saveEdit(gameUI.notify);
};

const handleCopySuccess = () => {
  gameUI.notify(t('copySuccess'));
};

const consumeAndLoadVision = () => {
  if (visionConsumed.value) return;
  const candidates = useVisionBridge().consumeChessVisionCandidates();
  if (candidates && candidates.length > 0) {
    gameState.loadBoardState(candidates[0]);
    visionConsumed.value = true;
    const sideText = gameState.currentPlayer.value === PlayerSide.RED ? t('chessRed') : t('chessBlack');
    gameUI.notify(t('visionBoardLoaded', sideText));
  }
};

onMounted(() => {
  gameRecords.fetchRecords();
  consumeAndLoadVision();
});

onActivated(() => {
  consumeAndLoadVision();
});

onUnmounted(() => {
  gameAI.terminateWorker();
});

onDeactivated(() => {
  gameAI.terminateWorker();
});
</script>

<template>
  <div
    :class="currentTheme === 'dark' ? 'bg-stone-900 text-stone-100' : 'bg-stone-100 text-stone-800'"
    class="min-h-screen flex flex-col items-center py-8 font-sans transition-colors duration-300 relative"
  >
    <NotificationToast
      :show="gameUI.showNotification.value"
      :message="gameUI.notificationMessage.value"
    />

    <h1
      class="text-4xl font-bold mb-6 tracking-tight"
      :class="currentTheme === 'dark' ? 'text-stone-100' : 'text-stone-800'"
    >
      {{ t('chineseChessTitle') }}
    </h1>

    <GameControls
      :mode="gameState.mode.value"
      :currentPlayer="gameState.currentPlayer.value"
      :winner="gameState.winner.value"
      :moveHistoryLength="gameState.moveHistory.value.length"
      :aiDifficulty="gameState.aiDifficulty.value"
      :aiRole="gameState.aiRole.value"
      :isAnalysisMode="gameState.isAnalysisMode.value"
      :showThinking="gameAI.showThinking.value"
      :showSteps="gameState.showSteps.value"
      :isAiThinking="gameAI.isAiThinking.value"
      :theme="theme"
      @setMode="handleSetMode"
      @setAiDifficulty="handleSetAiDifficulty"
      @setAiRole="handleSetAiRole"
      @showHint="handleShowHint"
      @undo="handleUndo"
      @resetGame="handleResetGame"
      @toggleAnalysisMode="handleToggleAnalysisMode"
      @toggleThinking="gameAI.toggleThinking"
      @toggleSteps="gameState.toggleSteps"
      @saveGame="gameUI.openSaveModal"
      @exportBoard="handleExportBoard"
      @showRecords="handleOpenRecords"
      @updateTheme="settings.setChessTheme"
    />

    <div class="flex flex-col lg:flex-row items-start justify-center w-full px-4 gap-4 sm:gap-6 lg:gap-8">
      <div class="hidden lg:block w-64 shrink-0"></div>

      <div class="flex justify-center shrink-0">
        <Board
          ref="boardRef"
          :board="gameState.board.value"
          :currentPlayer="gameState.currentPlayer.value"
          :winner="gameState.winner.value"
          :mode="gameState.mode.value"
          :hintMove="gameAI.hintMove.value || undefined"
          :moveHistory="gameState.moveHistory.value"
          :winningLine="gameState.winningLine.value"
          :aiPlayer="gameState.aiPlayer.value"
          :isAnalysisMode="gameState.isAnalysisMode.value"
          :thinkingPath="gameAI.thinkingPath.value"
          :showSteps="gameState.showSteps.value"
          :selectedPiece="gameState.selectedPiece.value"
          :validMoves="gameState.validMoves.value"
          :theme="theme"
          @selectPiece="handleSelectPiece"
          @movePiece="handleMovePiece"
          @clickCell="handleClickCell"
        />
      </div>

      <div class="w-full lg:w-64 shrink-0 flex flex-col justify-start gap-4 self-stretch h-[360px] sm:h-[440px] lg:h-[600px]">
        <div
          class="text-lg sm:text-xl font-semibold px-4 sm:px-6 py-2 sm:py-3 rounded-lg shadow-sm border text-center w-full transition-colors shrink-0"
          :class="[
            currentTheme === 'dark' ? 'bg-stone-800 border-stone-700 text-stone-100' : 'bg-white border-stone-200 text-stone-700',
            gameState.isAnalysisMode.value ? (currentTheme === 'dark' ? 'ring-2 ring-indigo-500 text-indigo-300' : 'ring-2 ring-indigo-400 text-indigo-700') : ''
          ]"
        >
          {{ gameUI.getStatusText(gameState.winner.value, gameState.currentPlayer.value, gameAI.isAiThinking.value, gameState.isAnalysisMode.value, gameState.gameStatus.value) }}
        </div>
        <div class="flex-1 min-h-0 overflow-hidden">
          <ChineseChessHistoryPanel
            :moveHistory="gameState.moveHistory.value"
            @copySuccess="handleCopySuccess"
          />
        </div>
      </div>
    </div>

    <div
      class="mt-4 sm:mt-6 lg:mt-8 text-xs sm:text-sm max-w-md px-4 text-center transition-colors"
      :class="currentTheme === 'dark' ? 'text-stone-400' : 'text-stone-500'"
    >
      <p>{{ t('chineseChessRules') }}</p>
      <p v-if="gameState.mode.value === 'pve'" class="mt-1">
        {{ t('currentModePve', gameUI.getAiRoleText(gameState.aiRole.value), gameUI.getAiDifficultyText(gameState.aiDifficulty.value)) }}
      </p>
    </div>

    <SaveGameModal
      :isOpen="gameUI.isSaveModalOpen.value"
      :saveName="gameUI.saveName.value"
      :saveNameError="gameUI.saveNameError.value"
      @update:saveName="gameUI.saveName.value = $event"
      @save="handleSaveGame"
      @close="gameUI.closeSaveModal"
    />

    <GameRecordsModal
      :isOpen="gameUI.isRecordsModalOpen.value"
      :records="gameRecords.gameRecords.value"
      :currentRecordId="gameState.currentRecordId.value"
      :editingGameId="gameRecords.editingGameId.value"
      :editingName="gameRecords.editingName.value"
      :canEditGame="gameRecords.canEditGame"
      @close="gameUI.closeRecordsModal"
      @import="handleImportGame"
      @update="handleUpdateGame"
      @delete="handleDeleteGame"
      @startEdit="handleStartEdit"
      @update:editingName="gameRecords.editingName.value = $event"
      @saveEdit="handleSaveEdit"
      @cancelEdit="gameRecords.cancelEditing"
    />

    <DeleteConfirmModal
      :isOpen="!!gameUI.gameToDelete.value"
      @confirm="handleConfirmDelete"
      @cancel="gameUI.closeDeleteConfirm"
    />
  </div>
</template>
