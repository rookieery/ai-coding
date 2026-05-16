import { nextTick, type Ref } from 'vue';
import { useRouter } from 'vue-router';
import { t } from '../i18n';
import { PlayerSide } from '../games/chinese-chess/types';
import { convertBoardStateToCodes } from '../games/chinese-chess/utils';
import type { AgentMessage } from '../types/agent';
import type AgentChatMessages from '../components/agent/AgentChatMessages.vue';

interface ChessAnalysisData {
  board: Parameters<typeof convertBoardStateToCodes>[0];
  currentPlayer: string;
  imageBase64: string;
}

interface GomokuAnalysisData {
  pieces: number[][];
  question: string;
  imageBase64: string;
}

interface AgentVisionDeps {
  messages: Ref<AgentMessage[]>;
  chatMessagesRef: Ref<InstanceType<typeof AgentChatMessages> | null>;
  isThinking: Ref<boolean>;
  isExitingGomoku: Ref<boolean>;
  pendingQuestion: Ref<string | null>;
  setThinkingContent: (v: string) => void;
  setAnswerContent: (v: string) => void;
  showThinkingProcess: Ref<boolean>;
  currentUserQuery: Ref<string>;
  executeStreamingChat: (prompt: string) => Promise<void>;
  exitPlayMode: () => void;
  setVisionCandidatesForReplay: (candidates: number[][][]) => void;
  setChessVisionCandidatesForReplay: (candidates: number[][][]) => void;
  clearPendingRequest: () => void;
  consumePendingAnalysis: () => GomokuAnalysisData | null;
  consumeChessAnalysis: () => ChessAnalysisData | null;
}

export function useAgentVision(deps: AgentVisionDeps) {
  const {
    messages,
    chatMessagesRef,
    isThinking,
    isExitingGomoku,
    pendingQuestion,
    setThinkingContent,
    setAnswerContent,
    showThinkingProcess,
    currentUserQuery,
    executeStreamingChat,
    exitPlayMode,
    setVisionCandidatesForReplay,
    setChessVisionCandidatesForReplay,
    clearPendingRequest,
    consumePendingAnalysis,
    consumeChessAnalysis,
  } = deps;

  const router = useRouter();

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
    setThinkingContent('');
    setAnswerContent('');
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
    setThinkingContent('');
    setAnswerContent('');
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
      setThinkingContent('');
      setAnswerContent('');
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
    setThinkingContent(t('visionAnalyzingPosition'));
    setAnswerContent('');
    showThinkingProcess.value = true;

    await chatMessagesRef.value?.scrollToBottom();

    const boardJson = JSON.stringify(analysis.pieces);
    const combinedPrompt = `这是当前15x15棋盘的精确数据：${boardJson}，请结合数据回答：${analysis.question}`;

    executeStreamingChat(combinedPrompt);
  };

  return {
    handleConfirmReplay,
    handleConfirmAnalysis,
    handleVisionConfirmClose,
    handleChessConfirmReplay,
    handleChessConfirmAnalysis,
    handleChessVisionConfirmClose,
    processPendingAnalysis,
  };
}
