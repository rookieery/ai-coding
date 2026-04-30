import { ref } from 'vue';
import { PlayerSide, GameStatus, type Difficulty } from '../types';
import { t } from '../../../i18n';

export function useGameUI() {
  const showNotification = ref(false);
  const notificationMessage = ref('');

  const isSaveModalOpen = ref(false);
  const isRecordsModalOpen = ref(false);
  const gameToDelete = ref<string | null>(null);

  const saveName = ref('');
  const saveNameError = ref('');

  const notify = (msg: string) => {
    notificationMessage.value = msg;
    showNotification.value = true;
    setTimeout(() => {
      showNotification.value = false;
    }, 2000);
  };

  const openSaveModal = () => {
    saveName.value = '';
    saveNameError.value = '';
    isSaveModalOpen.value = true;
  };

  const closeSaveModal = () => {
    isSaveModalOpen.value = false;
  };

  const openRecordsModal = () => {
    isRecordsModalOpen.value = true;
  };

  const closeRecordsModal = () => {
    isRecordsModalOpen.value = false;
  };

  const openDeleteConfirm = (gameId: string) => {
    gameToDelete.value = gameId;
  };

  const closeDeleteConfirm = () => {
    gameToDelete.value = null;
  };

  const playSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
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
    } catch {
      // Ignore audio errors
    }
  };

  const getStatusText = (
    winner: PlayerSide | undefined,
    currentPlayer: PlayerSide,
    isAiThinking: boolean,
    isAnalysisMode: boolean,
    status: GameStatus
  ): string => {
    if (winner === PlayerSide.RED) return t('statusRedWin');
    if (winner === PlayerSide.BLACK) return t('statusBlackWinChess');
    if (status === GameStatus.CHECKMATE) {
      return winner === PlayerSide.RED ? t('statusRedWin') : t('statusBlackWinChess');
    }
    if (status === GameStatus.STALEMATE) return t('statusStalemate');
    if (status === GameStatus.DRAW) return t('statusDraw');
    if (status === GameStatus.CHECK) return t('statusCheck');

    const turnText = currentPlayer === PlayerSide.RED ? t('statusRedTurn') : t('statusBlackTurnChess');
    const thinkingText = isAiThinking ? ` (${t('aiThinking')})` : '';

    if (isAnalysisMode) return `${t('analysisMode')} - ${turnText}${thinkingText}`;
    return `${turnText}${thinkingText}`;
  };

  const getAiRoleText = (aiRole: 'red' | 'black'): string => {
    return aiRole === 'red' ? t('chessRed') : t('chessBlack');
  };

  const getAiDifficultyText = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'beginner': return t('difficultyBeginner');
      case 'intermediate': return t('difficultyIntermediate');
      case 'advanced': return t('difficultyAdvanced');
      case 'expert': return t('difficultyExpert');
    }
  };

  return {
    showNotification,
    notificationMessage,
    isSaveModalOpen,
    isRecordsModalOpen,
    gameToDelete,
    saveName,
    saveNameError,

    notify,
    openSaveModal,
    closeSaveModal,
    openRecordsModal,
    closeRecordsModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    playSound,
    getStatusText,
    getAiRoleText,
    getAiDifficultyText,
  };
}
