import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, MessageAuthor } from '../types';
import { DownloadCloudIcon, ShieldCheckIcon, MailIcon } from './Icons';

interface MessageProps {
  message: ChatMessage;
  onSealReport: (messageId: string) => void;
  onSealAndEmailReport: (messageId: string) => void;
  isEnterpriseMode: boolean;
}

const Message: React.FC<MessageProps> = ({ message, onSealReport, onSealAndEmailReport, isEnterpriseMode }) => {
  const isUser = message.author === MessageAuthor.USER;
  const isAI = message.author === MessageAuthor.AI;
  const isReport = isAI && message.content.includes('## Sealing Metadata');

  const containerClasses = `flex w-full mt-2 space-x-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : ''}`;
  const bubbleClasses = `p-4 rounded-lg ${isUser ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`;
  
  return (
    <div className={containerClasses}>
      <div>
        <div className={bubbleClasses}>
            {isAI ? (
                <ReactMarkdown 
                    className="prose prose-sm dark:prose-invert max-w-none"
                    remarkPlugins={[remarkGfm]}
                    components={{
                        h2: ({node, ...props}) => <h2 className="font-bold text-base mt-4 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="font-semibold text-sm mt-3 mb-1" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc list-inside" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-2" {...props} />,
                        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                    }}
                >
                    {message.content}
                </ReactMarkdown>
            ) : (
                <p className="text-sm">{message.content}</p>
            )}
        </div>
        {message.verificationResult && (
             <div className="mt-2 text-xs text-green-600 dark:text-green-400 flex items-start justify-end space-x-1">
                <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="text-right">
                    <div>{message.verificationResult.notes}</div>
                    <div className="text-gray-400 dark:text-gray-500 text-[10px] italic capitalize">
                        Analyst: {message.verificationResult.analyst}
                        {' | '}
                        Consultant: {message.verificationResult.consultant}
                        {' | '}
                        Verifier: {message.verificationResult.verifier}
                    </div>
                </div>
            </div>
        )}
        {isReport && (
          <div className="mt-2 flex justify-end space-x-2">
            <button
              onClick={() => onSealReport(message.id)}
              className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Download sealed PDF report"
            >
              <DownloadCloudIcon className="h-4 w-4" />
              <span>Seal Report</span>
            </button>
            {isEnterpriseMode && (
                 <button
                 onClick={() => onSealAndEmailReport(message.id)}
                 className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                 title="Download sealed PDF and email to Verum Global Foundation"
                 >
                    <MailIcon className="h-4 w-4" />
                    <span>Seal & Email Report</span>
                </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;