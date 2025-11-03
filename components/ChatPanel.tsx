import React, { useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import Message from './Message';
import ChatInput from './ChatInput';
import { LoadingSpinner } from './Icons';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onFilesChange: (files: FileList) => void;
  onSealReport: (messageId: string) => void;
  onSealAndEmailReport: (messageId: string) => void;
  loadingState: 'idle' | 'analyzing' | 'consulting' | 'synthesizing' | 'verifying';
  isComplexMode: boolean;
  onToggleComplexMode: () => void;
  isEnterpriseMode: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ 
    messages, 
    onSendMessage, 
    onFilesChange, 
    onSealReport,
    onSealAndEmailReport,
    loadingState,
    isComplexMode,
    onToggleComplexMode,
    isEnterpriseMode
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingState]);
  
  const loadingMessages = {
    analyzing: "Analyzing with Primary AI...",
    consulting: "Consulting with Secondary AI for second opinion...",
    synthesizing: "Synthesizing final report...",
    verifying: "Triple-verifying analysis...",
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="max-w-4xl mx-auto">
          {messages.map((msg) => (
            <Message
              key={msg.id}
              message={msg}
              onSealReport={onSealReport}
              onSealAndEmailReport={onSealAndEmailReport}
              isEnterpriseMode={isEnterpriseMode}
            />
          ))}
          {loadingState !== 'idle' && (
            <div className="flex w-full mt-2 space-x-3 max-w-3xl">
              <div>
                <div className="p-4 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white flex items-center space-x-2">
                  <LoadingSpinner className="h-5 w-5" />
                  <span className="text-sm">{loadingMessages[loadingState as keyof typeof loadingMessages] ?? 'Processing...'}</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      <ChatInput
        onSendMessage={onSendMessage}
        onFilesChange={onFilesChange}
        isLoading={loadingState !== 'idle'}
        isComplexMode={isComplexMode}
        onToggleComplexMode={onToggleComplexMode}
      />
    </div>
  );
};

export default ChatPanel;
