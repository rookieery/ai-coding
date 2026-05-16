import { nextTick, type Ref } from 'vue';
import { t } from '../i18n';
import { chessLlmApi } from '../games/chinese-chess/api/chessLlmApi';
import { parseChessMoveText } from '../games/chinese-chess/moveParser';
import { PlayerSide, PieceType } from '../games/chinese-chess/types';
import type { MoveHistory } from '../games/chinese-chess/types';
import type { ChessLLMMoveRecord } from '../games/chinese-chess/api/chessLlmApi';
import type { AgentMessage } from '../types/agent';
import type AgentChessPanel from '../components/agent/AgentChessPanel.vue';
import type AgentChatMessages from '../components/agent/AgentChatMessages.vue';

interface AgentChessDeps {
  messages: Ref<AgentMessage[]>;
  chatMessagesRef: Ref<InstanceType<typeof AgentChatMessages> | null>;
  chessPanelRef: Ref<InstanceType<typeof AgentChessPanel> | null>;
  isThinking: Ref<boolean>;
  isAIThinking: Ref<boolean>;
  setThinkingContent: (v: string) => void;
  setAnswerContent: (v: string) => void;
  showThinkingProcess: Ref<boolean>;
  resetThinkingState: () => void;
}

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

export function useAgentChess(deps: AgentChessDeps) {
  const {
    messages,
    chatMessagesRef,
    chessPanelRef,
    isThinking,
    isAIThinking,
    setThinkingContent,
    setAnswerContent,
    showThinkingProcess,
    resetThinkingState,
  } = deps;

  const handleChessUserMove = async (move: { from: { row: number; col: number }; to: { row: number; col: number }; notation: string }) => {
    messages.value.push({
      role: 'user',
      text: t('chessUserMoveMsg', move.notation),
    });

    if (!chessPanelRef.value) return;

    isAIThinking.value = true;
    isThinking.value = true;
    setThinkingContent(t('chessLlmThinking'));
    setAnswerContent('');
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

      setThinkingContent(combinedReasoning);

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
      text: t('chessCheckmateMsg', result.winner),
    });
  };

  const handleChessAiFirstMove = async () => {
    if (!chessPanelRef.value) return;

    isAIThinking.value = true;
    isThinking.value = true;
    setThinkingContent(t('chessLlmThinking'));
    setAnswerContent('');
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

      setThinkingContent(combinedReasoning);

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

  const tryInterceptMove = (text: string, clearInput: () => void): boolean => {
    const board = chessPanelRef.value?.getBoard();
    if (!board) return false;

    const parsed = parseChessMoveText(text, board);
    if (!parsed) return false;

    const { from, to } = parsed;

    if (chessPanelRef.value?.isValidMove(from, to)) {
      clearInput();
      chessPanelRef.value.placeUserPieceFromChat(from, to);
    } else {
      messages.value.push({ role: 'user', text });
      messages.value.push({ role: 'agent', text: t('chessInvalidMoveMsg') });
      clearInput();
    }

    return true;
  };

  return {
    handleChessUserMove,
    handleChessAiMove,
    handleChessGameOver,
    handleChessAiFirstMove,
    tryInterceptMove,
  };
}
