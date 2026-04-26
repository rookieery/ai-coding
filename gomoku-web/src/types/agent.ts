export interface AgentMessage {
  role: 'user' | 'agent';
  text: string;
  reasoningContent?: string;
  relatedUserQuery?: string;
  isGameSelector?: boolean;
  isGameSelectorDismissed?: boolean;
  isGameReasoning?: boolean;
  hasImage?: boolean;
  imageBase64?: string;
}
