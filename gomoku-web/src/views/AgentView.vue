<script setup lang="ts">
import { ref, nextTick, computed, onMounted, onActivated } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowLeft } from 'lucide-vue-next';
import { currentTheme, t } from '../i18n';
import { gomokuAiApi } from '../api/gomoku-ai-api';
import { visionApi } from '../api/vision-api';
import { useGlobalAgentPlay } from '../composables/useAgentPlay';
import { useAgentChat } from '../composables/useAgentChat';
import { useSplitDrag } from '../composables/useSplitDrag';
import { useVisionBridge } from '../composables/useVisionBridge';
import { BOARD_SIZE } from '../games/gomoku/gameLogic';
import { parseMoveText } from '../games/gomoku/moveParser';
import { parseChessMoveText } from '../games/chinese-chess/moveParser';
import { convertBoardStateToCodes } from '../games/chinese-chess/utils';
import { PlayerSide, PieceType } from '../games/chinese-chess/types';
import type { MoveHistory } from '../games/chinese-chess/types';
import { chessLlmApi } from '../games/chinese-chess/api/chessLlmApi';
import type { ChessLLMMoveRecord } from '../games/chinese-chess/api/chessLlmApi';
import AgentGomokuPanel from '../components/AgentGomokuPanel.vue';
import AgentChessPanel from '../components/agent/AgentChessPanel.vue';
import AgentVisionPanel from '../components/agent/AgentVisionPanel.vue';
import AgentChessVisionPanel from '../components/agent/AgentChessVisionPanel.vue';
import AgentWelcomeScreen from '../components/agent/AgentWelcomeScreen.vue';
import AgentChatMessages from '../components/agent/AgentChatMessages.vue';
import AgentChatInput from '../components/agent/AgentChatInput.vue';
import type { AgentMessage } from '../types/agent';

defineOptions({
  name: 'AgentView'
});

const query = ref('');
const chatMessagesRef = ref<InstanceType<typeof AgentChatMessages> | null>(null);
const chatInputRef = ref<InstanceType<typeof AgentChatInput> | null>(null);
const gomokuPanelRef = ref<InstanceType<typeof AgentGomokuPanel> | null>(null);
const chessPanelRef = ref<InstanceType<typeof AgentChessPanel> | null>(null);
const visionPanelRef = ref<InstanceType<typeof AgentVisionPanel> | null>(null);
const showExitConfirm = ref(false);
const gameSelectorActive = ref(false);
const isExitingGomoku = ref(false);
const activeAbortController = ref<AbortController | null>(null);

const { playMode, enterGomokuMode, enterChessMode, enterVisionConfirmMode, enterChessVisionConfirmMode, exitPlayMode, visionCandidates, chessVisionCandidates, pendingImageBase64, pendingQuestion, isAIThinking } = useGlobalAgentPlay();
const { consumePendingAnalysis, setVisionCandidatesForReplay, setChessVisionCandidatesForReplay, clearPendingRequest, consumeChessAnalysis } = useVisionBridge();
const router = useRouter();

const isSplitLayout = computed(() => playMode.value === 'gomoku' || playMode.value === 'chinese-chess' || playMode.value === 'vision-confirm' || playMode.value === 'chess-vision-confirm' || isExitingGomoku.value);

const {
  messages,
  isThinking,
  thinkingContent,
  answerContent,
  showThinkingProcess,
  currentUserQuery,
  sendMessage,
  executeStreamingChat,
  regenerateStreamingAnswer,
  regenerateAnswer,
  stopGeneration,
} = useAgentChat({
  scrollToBottom: async () => {
    await chatMessagesRef.value?.scrollToBottom();
  },
});

const { leftPanelWidth, isDragging, startDrag } = useSplitDrag();

const resetThinkingState = () => {
  isThinking.value = false;
  thinkingContent.value = '';
  answerContent.value = '';
  showThinkingProcess.value = true;
  activeAbortController.value = null;
};

const handleStop = () => {
  if (activeAbortController.value) {
    activeAbortController.value.abort();
    activeAbortController.value = null;
  }
  stopGeneration();
};

const handleEnterGomokuMode = () => {
  gameSelectorActive.value = true;
  messages.value.push({
    role: 'agent',
    text: t('agentGameSelectorPrompt'),
    isGameSelector: true
  });
};

const handleGameSelection = async (gameType: string, msg: AgentMessage) => {
  msg.isGameSelector = false;
  gameSelectorActive.value = false;

  const gameName = gameType === 'gomoku' ? t('agentGameGomoku') : t('agentGameChineseChess');

  messages.value = [
    { role: 'agent', text: t('agentGameSelectorPrompt') },
    { role: 'user', text: gameName },
  ];

  if (gameType === 'gomoku') {
    enterGomokuMode();
    gomokuPanelRef.value?.resetGame();
  } else if (gameType === 'chinese-chess') {
    enterChessMode();
    chessPanelRef.value?.resetGame();
  }

  messages.value.push({
    role: 'agent',
    text: gameType === 'chinese-chess' ? t('chessPlayModeEntered') : t('agentGomokuModeEntered')
  });

  await nextTick();
  chatMessagesRef.value?.scrollToBottom();
};

const handleUserMove = async (r: number, c: number, userCoord?: string) => {
  const colLetter = String.fromCharCode(65 + c);
  const rowNumber = BOARD_SIZE - r;
  const moveCoord = userCoord || `${colLetter}${rowNumber}`;

  messages.value.push({
    role: 'user',
    text: t('agentUserMoveNotification', moveCoord)
  });

  if (!gomokuPanelRef.value) return;

  const board = gomokuPanelRef.value.getBoard();
  const moveHistory = gomokuPanelRef.value.getMoveHistory();

  isThinking.value = true;
  thinkingContent.value = t('agentAiThinkingMove');
  answerContent.value = '';
  showThinkingProcess.value = true;
  activeAbortController.value = new AbortController();

  await chatMessagesRef.value?.scrollToBottom();

  try {
    const response = await gomokuAiApi.generateMove({
      board,
      currentPlayer: 'white',
      moveHistory,
    }, activeAbortController.value.signal);

    if (response.success && response.data) {
      const { x, y, reason, isFallback } = response.data;

      thinkingContent.value = reason;

      if (isFallback) {
        showThinkingProcess.value = false;
      }

      messages.value.push({
        role: 'agent',
        text: reason,
        reasoningContent: isFallback ? undefined : reason,
        isGameReasoning: true,
      });

      gomokuPanelRef.value.placeAiPiece(y, x);

      resetThinkingState();

      await chatMessagesRef.value?.scrollToBottom();
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      resetThinkingState();
      return;
    }
    const errorMessage = error instanceof Error ? error.message : t('llmMoveFailed');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`,
    });
    resetThinkingState();
    await chatMessagesRef.value?.scrollToBottom();
  }
};

const handleAiFirstMove = async () => {
  if (!gomokuPanelRef.value) return;

  const board = gomokuPanelRef.value.getBoard();
  const moveHistory = gomokuPanelRef.value.getMoveHistory();

  isThinking.value = true;
  thinkingContent.value = t('agentAiThinkingMove');
  answerContent.value = '';
  showThinkingProcess.value = true;
  activeAbortController.value = new AbortController();

  await chatMessagesRef.value?.scrollToBottom();

  try {
    const response = await gomokuAiApi.generateMove({
      board,
      currentPlayer: 'black',
      moveHistory,
    }, activeAbortController.value.signal);

    if (response.success && response.data) {
      const { x, y, reason, isFallback } = response.data;

      gomokuPanelRef.value.placeAiPiece(y, x);

      const colLetter = String.fromCharCode(65 + x);
      const rowNumber = BOARD_SIZE - y;
      const moveCoord = `${colLetter}${rowNumber}`;

      if (isFallback) {
        messages.value.push({
          role: 'agent',
          text: t('agentAiFirstMoveNotification', moveCoord)
        });
      } else {
        thinkingContent.value = reason;
        messages.value.push({
          role: 'agent',
          text: reason,
          reasoningContent: reason,
          isGameReasoning: true,
        });
      }

      resetThinkingState();

      await chatMessagesRef.value?.scrollToBottom();
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      resetThinkingState();
      return;
    }
    const errorMessage = error instanceof Error ? error.message : t('llmMoveFailed');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`,
    });
    resetThinkingState();
    await chatMessagesRef.value?.scrollToBottom();
  }
};

const handleSurrender = () => {
  messages.value.push({
    role: 'agent',
    text: t('agentSurrenderNotification')
  });
};

const PIECE_TYPE_INDEX: Record<string, number> = {
  [PieceType.KING]: 0,
  [PieceType.ADVISOR]: 1,
  [PieceType.ELEPHANT]: 2,
  [PieceType.KNIGHT]: 3,
  [PieceType.ROOK]: 4,
  [PieceType.CANNON]: 5,
  [PieceType.PAWN]: 6,
};

const pieceToCode = (type: PieceType, side: PlayerSide): number => {
  const base = side === PlayerSide.RED ? 1 : 8;
  return base + (PIECE_TYPE_INDEX[type] ?? 0);
};

const convertMoveHistory = (history: MoveHistory[]): ChessLLMMoveRecord[] =>
  history.map(m => ({
    from: m.from,
    to: m.to,
    piece: pieceToCode(m.piece, m.side),
    capturedPiece: m.capturedPiece
      ? pieceToCode(m.capturedPiece.type, m.capturedPiece.side)
      : undefined,
  }));

const handleChessUserMove = async (move: { from: { row: number; col: number }; to: { row: number; col: number }; notation: string }) => {
  messages.value.push({
    role: 'user',
    text: t('chessUserMoveMsg', move.notation)
  });

  if (!chessPanelRef.value) return;

  isAIThinking.value = true;
  isThinking.value = true;
  thinkingContent.value = t('chessLlmThinking');
  answerContent.value = '';
  showThinkingProcess.value = true;

  await chatMessagesRef.value?.scrollToBottom();

  try {
    const board = chessPanelRef.value.getBoard();
    const currentPlayer = chessPanelRef.value.getCurrentPlayer();
    const moveHistory = convertMoveHistory(chessPanelRef.value.getMoveHistory());

    const response = await chessLlmApi.generateMove({
      board,
      currentPlayer,
      moveHistory,
    });

    const { move: aiMove, reason, situationAnalysis, isFallback } = response;

    const combinedReasoning = situationAnalysis
      ? `${t('chessLlmSituation')}: ${situationAnalysis}\n\n${t('chessLlmMoveReason')}: ${reason}`
      : reason;

    thinkingContent.value = combinedReasoning;

    if (isFallback) {
      showThinkingProcess.value = false;
    }

    messages.value.push({
      role: 'agent',
      text: reason,
      reasoningContent: isFallback ? undefined : combinedReasoning,
      isGameReasoning: true,
    });

    const placeResult = chessPanelRef.value.placeAiPiece(aiMove.from, aiMove.to);

    if (placeResult?.check && !placeResult.gameOver) {
      messages.value.push({
        role: 'agent',
        text: t('chessCheckMsg'),
      });
    }

    resetThinkingState();
    isAIThinking.value = false;

    await chatMessagesRef.value?.scrollToBottom();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('llmMoveFailed');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`,
    });
    resetThinkingState();
    isAIThinking.value = false;
    await chatMessagesRef.value?.scrollToBottom();
  }
};

const handleChessAiMove = (_move: { from: { row: number; col: number }; to: { row: number; col: number }; notation: string }) => {
  // AI move display is handled in handleChessUserMove flow
};

const handleChessGameOver = (result: { winner: string; reason: string }) => {
  isAIThinking.value = false;
  messages.value.push({
    role: 'agent',
    text: t('chessCheckmateMsg', result.winner)
  });
};

const handleChessAiFirstMove = async () => {
  if (!chessPanelRef.value) return;

  isAIThinking.value = true;
  isThinking.value = true;
  thinkingContent.value = t('chessLlmThinking');
  answerContent.value = '';
  showThinkingProcess.value = true;

  await chatMessagesRef.value?.scrollToBottom();

  try {
    const board = chessPanelRef.value.getBoard();
    const currentPlayer = chessPanelRef.value.getCurrentPlayer();
    const moveHistory = convertMoveHistory(chessPanelRef.value.getMoveHistory());

    const response = await chessLlmApi.generateMove({
      board,
      currentPlayer,
      moveHistory,
    });

    const { move: aiMove, reason, situationAnalysis, isFallback } = response;

    const combinedReasoning = situationAnalysis
      ? `${t('chessLlmSituation')}: ${situationAnalysis}\n\n${t('chessLlmMoveReason')}: ${reason}`
      : reason;

    thinkingContent.value = combinedReasoning;

    if (isFallback) {
      showThinkingProcess.value = false;
    }

    messages.value.push({
      role: 'agent',
      text: reason,
      reasoningContent: isFallback ? undefined : combinedReasoning,
      isGameReasoning: true,
    });

    const placeResult = chessPanelRef.value.placeAiPiece(aiMove.from, aiMove.to);

    if (placeResult?.check && !placeResult.gameOver) {
      messages.value.push({
        role: 'agent',
        text: t('chessCheckMsg'),
      });
    }

    resetThinkingState();
    isAIThinking.value = false;

    await chatMessagesRef.value?.scrollToBottom();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : t('llmMoveFailed');
    messages.value.push({
      role: 'agent',
      text: `${t('genericErrorPrefix')}${errorMessage}`,
    });
    resetThinkingState();
    isAIThinking.value = false;
    await chatMessagesRef.value?.scrollToBottom();
  }
};

const handleExitClick = () => {
  showExitConfirm.value = true;
};

const handleConfirmReplay = (pieces: number[][]) => {
  setVisionCandidatesForReplay([pieces]);
  exitPlayMode();
  router.push({ name: 'game' });
};

const handleConfirmAnalysis = async (pieces: number[][], boardImageBase64: string) => {
  const question = pendingQuestion.value;

  exitPlayMode();

  await nextTick();

  const displayText = question
    ? `${t('agentVisionBoardConfirmed')}，${question}`
    : t('agentVisionBoardConfirmed');

  messages.value.push({
    role: 'user',
    text: displayText,
    hasImage: true,
    imageBase64: boardImageBase64 || undefined,
  });

  await chatMessagesRef.value?.scrollToBottom();

  const boardJson = JSON.stringify(pieces);
  const combinedPrompt = question
    ? `这是当前15x15棋盘的精确数据：${boardJson}，请结合数据回答：${question}`
    : `这是当前15x15棋盘的精确数据：${boardJson}，${t('agentVisionDefaultAnalysis')}`;

  currentUserQuery.value = question || t('agentVisionDefaultAnalysis');

  isThinking.value = true;
  thinkingContent.value = '';
  answerContent.value = '';
  showThinkingProcess.value = true;

  await executeStreamingChat(combinedPrompt);
};

const handleVisionConfirmClose = () => {
  isExitingGomoku.value = true;
  exitPlayMode();
  clearPendingRequest();

  messages.value.push({
    role: 'agent',
    text: t('agentVisionConfirmCancelled'),
  });

  nextTick(() => {
    chatMessagesRef.value?.scrollToBottom();
  });

  setTimeout(() => {
    isExitingGomoku.value = false;
  }, 400);
};

const handleChessConfirmReplay = (pieces: number[][]) => {
  setChessVisionCandidatesForReplay([pieces]);
  exitPlayMode();
  router.push({ name: 'chinese-chess' });
};

const handleChessConfirmAnalysis = async (pieces: number[][], boardImageBase64: string) => {
  const question = pendingQuestion.value;

  exitPlayMode();

  await nextTick();

  const displayText = question
    ? `${t('agentVisionBoardConfirmed')}，${question}`
    : t('agentVisionBoardConfirmed');

  messages.value.push({
    role: 'user',
    text: displayText,
    hasImage: true,
    imageBase64: boardImageBase64 || undefined,
  });

  await chatMessagesRef.value?.scrollToBottom();

  const boardJson = JSON.stringify(pieces);
  const encodingExplain = '编码说明: 0=空, 1=红帅 2=红仕 3=红相 4=红马 5=红车 6=红炮 7=红兵, 8=黑将 9=黑士 10=黑象 11=黑马 12=黑车 13=黑炮 14=黑卒';
  const combinedPrompt = question
    ? `这是当前10x9中国象棋棋盘的精确数据（${encodingExplain}）：${boardJson}，请结合数据回答：${question}`
    : `这是当前10x9中国象棋棋盘的精确数据（${encodingExplain}）：${boardJson}，请分析当前中国象棋棋局的攻防态势，指出双方的优劣势和关键位置，评估子力对比，给出后续推荐的行棋方向`;

  currentUserQuery.value = question || 'AI Tactical Analysis';

  isThinking.value = true;
  thinkingContent.value = '';
  answerContent.value = '';
  showThinkingProcess.value = true;

  await executeStreamingChat(combinedPrompt);
};

const handleChessVisionConfirmClose = () => {
  isExitingGomoku.value = true;
  exitPlayMode();
  clearPendingRequest();

  messages.value.push({
    role: 'agent',
    text: t('agentVisionConfirmCancelled'),
  });

  nextTick(() => {
    chatMessagesRef.value?.scrollToBottom();
  });

  setTimeout(() => {
    isExitingGomoku.value = false;
  }, 400);
};

const confirmExit = () => {
  showExitConfirm.value = false;
  gameSelectorActive.value = false;
  isExitingGomoku.value = true;
  exitPlayMode();
  setTimeout(() => {
    isExitingGomoku.value = false;
  }, 400);
};

const cancelExit = () => {
  showExitConfirm.value = false;
};

const processPendingAnalysis = async () => {
  const chessAnalysis = consumeChessAnalysis();
  if (chessAnalysis) {
    await nextTick();

    const boardCodes = convertBoardStateToCodes(chessAnalysis.board);
    const sideText = chessAnalysis.currentPlayer === PlayerSide.RED ? 'red' : 'black';

    messages.value.push({
      role: 'user',
      text: t('chessVisionDefaultAnalysis'),
      hasImage: true,
      imageBase64: chessAnalysis.imageBase64,
    });

    currentUserQuery.value = t('chessVisionDefaultAnalysis');

    isThinking.value = true;
    thinkingContent.value = '';
    answerContent.value = '';
    showThinkingProcess.value = true;

    await chatMessagesRef.value?.scrollToBottom();

    const boardJson = JSON.stringify(boardCodes);
    const encodingExplain = '编码说明: 0=空, 1=红帅 2=红仕 3=红相 4=红马 5=红车 6=红炮 7=红兵, 8=黑将 9=黑士 10=黑象 11=黑马 12=黑车 13=黑炮 14=黑卒';
    const combinedPrompt = `这是当前10x9中国象棋棋盘的精确数据（${encodingExplain}）：${boardJson}，当前轮到${sideText}方行棋，请分析当前中国象棋棋局的攻防态势，指出双方的优劣势和关键位置，评估子力对比，给出后续推荐的行棋方向`;

    await executeStreamingChat(combinedPrompt);
    return;
  }

  const analysis = consumePendingAnalysis();
  if (!analysis) return;

  await nextTick();

  messages.value.push({
    role: 'user',
    text: analysis.question,
    hasImage: true,
    imageBase64: analysis.imageBase64,
  });

  currentUserQuery.value = analysis.question;

  isThinking.value = true;
  thinkingContent.value = t('visionAnalyzingPosition');
  answerContent.value = '';
  showThinkingProcess.value = true;

  await chatMessagesRef.value?.scrollToBottom();

  const boardJson = JSON.stringify(analysis.pieces);
  const combinedPrompt = `这是当前15x15棋盘的精确数据：${boardJson}，请结合数据回答：${analysis.question}`;

  executeStreamingChat(combinedPrompt);
};

onMounted(processPendingAnalysis);
onActivated(processPendingAnalysis);

const handleSend = async (payload: { text: string; imageBase64: string | null }) => {
  if (gameSelectorActive.value) {
    gameSelectorActive.value = false;
    const selectorMsg = messages.value.find(m => m.isGameSelector);
    if (selectorMsg) {
      selectorMsg.isGameSelectorDismissed = true;
    }
  }

  if (payload.imageBase64) {
    const userText = payload.text?.trim() || '';

    messages.value.push({
      role: 'user',
      text: userText,
      hasImage: true,
      imageBase64: payload.imageBase64,
    });

    query.value = '';
    chatInputRef.value?.resetTextareaHeight();

    isThinking.value = true;
    thinkingContent.value = '';
    answerContent.value = '';
    showThinkingProcess.value = true;
    activeAbortController.value = new AbortController();

    let visionBoardType: 'gomoku' | 'chinese_chess' | null = null;

    await nextTick();
    chatMessagesRef.value?.scrollToBottom();

    await visionApi.recognizeBoardStream(
      payload.imageBase64,
      (chunk) => {
        if (chunk.type === 'thinking' && chunk.text) {
          thinkingContent.value += chunk.text;
          if (!visionBoardType) {
            const thinking = thinkingContent.value.toLowerCase();
            if (thinking.includes('中国象棋') || thinking.includes('chinese_chess')) {
              visionBoardType = 'chinese_chess';
            } else if (thinking.includes('五子棋') || thinking.includes('gomoku')) {
              visionBoardType = 'gomoku';
            }
          }
          chatMessagesRef.value?.scrollToBottom();
        } else if (chunk.type === 'answer' && chunk.text) {
          if (!answerContent.value) {
            answerContent.value = visionBoardType === 'chinese_chess'
              ? t('visionRenderingChessBoard')
              : visionBoardType === 'gomoku'
                ? t('visionRenderingGomokuBoard')
                : t('visionRenderingBoard');
          }
          chatMessagesRef.value?.scrollToBottom();
        }
      },
      (error) => {
        if (error.name === 'AbortError') {
          resetThinkingState();
          return;
        }
        const errorMessage = error instanceof Error ? error.message : t('visionParseFailed');
        messages.value.push({
          role: 'agent',
          text: `${t('genericErrorPrefix')}${errorMessage}`,
        });
        resetThinkingState();
        nextTick(() => chatMessagesRef.value?.scrollToBottom());
      },
      (boardData) => {
        if (!boardData) {
          messages.value.push({
            role: 'agent',
            text: `${t('genericErrorPrefix')}${t('visionParseFailed')}`,
          });
          resetThinkingState();
          nextTick(() => chatMessagesRef.value?.scrollToBottom());
          return;
        }

        if (boardData.boardType === 'chinese_chess') {
          enterChessVisionConfirmMode(boardData.candidates, payload.imageBase64!, userText || undefined);
        } else {
          enterVisionConfirmMode(boardData.candidates, payload.imageBase64!, userText || undefined);
        }

        resetThinkingState();

        messages.value.push({
          role: 'agent',
          text: t('agentVisionConfirmEntered'),
        });

        nextTick(() => chatMessagesRef.value?.scrollToBottom());
      },
      activeAbortController.value.signal
    );

    return;
  }

  // Intercept chess move commands in chinese-chess mode
  if (playMode.value === 'chinese-chess') {
    const board = chessPanelRef.value?.getBoard();
    if (board) {
      const parsed = parseChessMoveText(payload.text, board);
      if (parsed) {
        const { from, to } = parsed;

        if (chessPanelRef.value?.isValidMove(from, to)) {
          query.value = '';
          chatInputRef.value?.resetTextareaHeight();
          chessPanelRef.value.placeUserPieceFromChat(from, to);
        } else {
          messages.value.push({ role: 'user', text: payload.text });
          messages.value.push({ role: 'agent', text: t('chessInvalidMoveMsg') });
          query.value = '';
          chatInputRef.value?.resetTextareaHeight();
        }
        return;
      }
    }
  }

  // Intercept chess move commands in gomoku mode
  if (playMode.value === 'gomoku') {
    const parsed = parseMoveText(payload.text);
    if (parsed) {
      const { r, c, coord } = parsed;

      // Validate the move
      if (gomokuPanelRef.value?.isValidMove(r, c)) {
        // Clear input
        query.value = '';
        chatInputRef.value?.resetTextareaHeight();

        // Execute the move (handleUserMove will add the notification message)
        gomokuPanelRef.value.placeUserPieceFromChat(r, c, coord);
      } else {
        // Invalid move - show error message
        messages.value.push({
          role: 'user',
          text: payload.text
        });
        messages.value.push({
          role: 'agent',
          text: t('agentInvalidMove', coord)
        });

        query.value = '';
        chatInputRef.value?.resetTextareaHeight();
      }
      return;
    }
  }

  // Default: regular chat message
  sendMessage(payload.text, () => {
    query.value = '';
    chatInputRef.value?.resetTextareaHeight();
  });
};
</script>

<template>
  <div class="flex w-full"
       :class="[
         isSplitLayout ? 'flex-row h-screen overflow-hidden' : 'flex-col items-center justify-center min-h-screen'
       ]">

    <!-- 左侧聊天区域 -->
    <div class="flex flex-col h-full shrink-0"
         :class="[
           isSplitLayout ? 'min-w-[320px] border-r panel-split' : 'max-w-4xl mx-auto min-h-[80vh] px-4 panel-full'
         ]"
         :style="isSplitLayout ? `width: ${leftPanelWidth}%` : 'width: 100%'">

      <!-- 返回按钮（仅分屏模式显示） -->
      <div v-if="playMode === 'gomoku' || playMode === 'chinese-chess' || playMode === 'vision-confirm' || playMode === 'chess-vision-confirm'" class="flex items-center px-4 py-3 border-b shrink-0"
           :class="currentTheme === 'dark' ? 'bg-stone-800 border-stone-700' : 'bg-white border-stone-200'">
        <button @click="handleExitClick"
                class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                :class="currentTheme === 'dark'
                  ? 'text-stone-300 hover:bg-stone-700'
                  : 'text-stone-600 hover:bg-stone-100'">
          <ArrowLeft class="w-4 h-4" />
          {{ t('agentBackToChat') }}
        </button>
      </div>

      <!-- 欢迎页 -->
      <AgentWelcomeScreen
        v-if="messages.length === 0"
        :class="isSplitLayout ? 'flex-1' : 'w-full'"
      />

      <!-- 消息列表 -->
      <div :class="isSplitLayout ? 'flex-1 overflow-y-auto' : 'w-full'">
        <AgentChatMessages
          v-if="messages.length > 0"
          ref="chatMessagesRef"
          :messages="messages"
          :is-thinking="isThinking"
          :thinking-content="thinkingContent"
          :answer-content="answerContent"
          :show-thinking-process="showThinkingProcess"
          @regenerate="regenerateAnswer"
          @toggle-thinking="(show: boolean) => showThinkingProcess = show"
          @regenerate-streaming="regenerateStreamingAnswer"
          @select-game="handleGameSelection"
        />
      </div>

      <!-- 输入区域 -->
      <AgentChatInput
        ref="chatInputRef"
        v-model:query="query"
        :is-thinking="isThinking"
        @send="handleSend"
        @stop="handleStop"
        :class="[
          'shrink-0',
          isSplitLayout ? 'px-4 max-w-full' : 'max-w-3xl'
        ]"
      >
        <template #actions>
          <button
            v-if="!isSplitLayout && !gameSelectorActive"
            @click="handleEnterGomokuMode"
            class="px-5 py-2.5 rounded-full font-medium transition-all duration-200 shadow-sm hover:shadow-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
          >
            {{ t('agentActionGomoku') }}
          </button>
        </template>
      </AgentChatInput>
    </div>

    <!-- 分割线（仅分屏模式显示） -->
    <div v-if="isSplitLayout"
         @mousedown="startDrag"
         class="w-1 self-stretch cursor-col-resize group transition-colors duration-200 z-50 relative"
         :class="isDragging
           ? 'bg-indigo-500'
           : (currentTheme === 'dark'
               ? 'bg-stone-700 hover:bg-indigo-400'
               : 'bg-stone-200 hover:bg-indigo-400')">
      <!-- 拖拽手柄视觉提示 -->
      <div class="absolute inset-y-0 -left-1 -right-1 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div class="w-1 h-8 rounded-full"
             :class="currentTheme === 'dark' ? 'bg-stone-500' : 'bg-stone-400'"></div>
      </div>
    </div>

    <!-- 右侧对弈面板（仅分屏模式显示） -->
    <transition name="slide-panel">
      <div v-if="playMode === 'gomoku' || playMode === 'chinese-chess' || playMode === 'vision-confirm' || playMode === 'chess-vision-confirm'" class="flex-1 h-full overflow-hidden panel-right"
           :class="currentTheme === 'dark' ? 'bg-stone-900' : 'bg-stone-50'">
        <AgentGomokuPanel
          v-if="playMode === 'gomoku'"
          ref="gomokuPanelRef"
          @userMove="handleUserMove"
          @surrender="handleSurrender"
          @aiFirstMove="handleAiFirstMove"
        />
        <AgentChessPanel
          v-else-if="playMode === 'chinese-chess'"
          ref="chessPanelRef"
          @userMove="handleChessUserMove"
          @aiMove="handleChessAiMove"
          @gameOver="handleChessGameOver"
          @aiFirstMove="handleChessAiFirstMove"
        />
        <AgentVisionPanel
          v-else-if="playMode === 'vision-confirm'"
          ref="visionPanelRef"
          :candidates="visionCandidates!"
          :imageBase64="pendingImageBase64!"
          @confirm-replay="handleConfirmReplay"
          @confirm-analysis="handleConfirmAnalysis"
          @close="handleVisionConfirmClose"
        />
        <AgentChessVisionPanel
          v-else-if="playMode === 'chess-vision-confirm'"
          :candidates="chessVisionCandidates!"
          :imageBase64="pendingImageBase64!"
          @confirm-replay="handleChessConfirmReplay"
          @confirm-analysis="handleChessConfirmAnalysis"
          @close="handleChessVisionConfirmClose"
        />
      </div>
    </transition>

    <!-- 退出确认弹窗 -->
    <div v-if="showExitConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="w-full max-w-md p-6 rounded-2xl shadow-xl transition-colors"
           :class="currentTheme === 'dark' ? 'bg-stone-800 text-stone-100 shadow-stone-900/50' : 'bg-white text-stone-800'">
        <div class="mb-6">
          <h3 class="text-xl font-bold mb-2">{{ t('agentExitConfirmTitle') }}</h3>
          <p class="opacity-70">{{ t('agentExitConfirmMessage') }}</p>
          <p class="opacity-70 mt-2">{{ t('agentExitConfirmWarning') }}</p>
        </div>
        <div class="flex justify-end gap-3">
          <button
            @click="cancelExit"
            class="px-4 py-2 rounded-lg font-medium transition-colors"
            :class="currentTheme === 'dark' ? 'bg-stone-700 hover:bg-stone-600 text-stone-200' : 'bg-stone-200 hover:bg-stone-300 text-stone-800'"
          >
            {{ t('cancel') }}
          </button>
          <button
            @click="confirmExit"
            class="px-4 py-2 rounded-lg font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
          >
            {{ t('confirm') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-split {
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-full {
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s;
}

.slide-panel-enter-active {
  animation: slide-in 0.45s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-panel-leave-active {
  animation: slide-out 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-in {
  0% {
    opacity: 0;
    transform: translateX(40px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes slide-out {
  0% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  30% {
    opacity: 0.5;
    transform: translateX(15px) scale(0.99);
  }
  100% {
    opacity: 0;
    transform: translateX(30px) scale(0.97);
  }
}
</style>
