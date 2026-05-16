import { nextTick, type Ref } from 'vue';
import { BOARD_SIZE } from '../games/gomoku/gameLogic';
import { parseMoveText } from '../games/gomoku/moveParser';
import { gomokuAiApi } from '../api/gomoku-ai-api';
import { t } from '../i18n';
import type { AgentMessage } from '../types/agent';
import type AgentGomokuPanel from '../components/AgentGomokuPanel.vue';
import type AgentChatMessages from '../components/agent/AgentChatMessages.vue';

interface AgentGomokuDeps {
  messages: Ref<AgentMessage[]>;
  chatMessagesRef: Ref<InstanceType<typeof AgentChatMessages> | null>;
  gomokuPanelRef: Ref<InstanceType<typeof AgentGomokuPanel> | null>;
  isThinking: Ref<boolean>;
  activeAbortController: Ref<AbortController | null>;
  setThinkingContent: (v: string) => void;
  setAnswerContent: (v: string) => void;
  showThinkingProcess: Ref<boolean>;
  resetThinkingState: () => void;
}

export function useAgentGomoku(deps: AgentGomokuDeps) {
  const {
    messages,
    chatMessagesRef,
    gomokuPanelRef,
    isThinking,
    activeAbortController,
    setThinkingContent,
    setAnswerContent,
    showThinkingProcess,
    resetThinkingState,
  } = deps;

  const handleUserMove = async (r: number, c: number, userCoord?: string) => {
    const colLetter = String.fromCharCode(65 + c);
    const rowNumber = BOARD_SIZE - r;
    const moveCoord = userCoord || `${colLetter}${rowNumber}`;

    messages.value.push({
      role: 'user',
      text: t('agentUserMoveNotification', moveCoord),
    });

    if (!gomokuPanelRef.value) return;

    const board = gomokuPanelRef.value.getBoard();
    const moveHistory = gomokuPanelRef.value.getMoveHistory();

    isThinking.value = true;
    setThinkingContent(t('agentAiThinkingMove'));
    setAnswerContent('');
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

        setThinkingContent(reason);

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
    setThinkingContent(t('agentAiThinkingMove'));
    setAnswerContent('');
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
            text: t('agentAiFirstMoveNotification', moveCoord),
          });
        } else {
          setThinkingContent(reason);
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
      text: t('agentSurrenderNotification'),
    });
  };

  const tryInterceptMove = (text: string, clearInput: () => void): boolean => {
    const parsed = parseMoveText(text);
    if (!parsed) return false;

    const { r, c, coord } = parsed;

    if (gomokuPanelRef.value?.isValidMove(r, c)) {
      clearInput();
      gomokuPanelRef.value.placeUserPieceFromChat(r, c, coord);
    } else {
      messages.value.push({ role: 'user', text });
      messages.value.push({ role: 'agent', text: t('agentInvalidMove', coord) });
      clearInput();
    }

    return true;
  };

  return {
    handleUserMove,
    handleAiFirstMove,
    handleSurrender,
    tryInterceptMove,
  };
}
