

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { PaperclipIcon, MicIcon, SendIcon, BrainIcon } from './Icons';
import { GoogleGenAI, LiveSession, LiveServerMessage, Modality } from '@google/genai';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onFilesChange: (files: FileList) => void;
  isLoading: boolean;
  isComplexMode: boolean;
  onToggleComplexMode: () => void;
}

// Helper functions for audio processing
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, onFilesChange, isLoading, isComplexMode, onToggleComplexMode }) => {
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesChange(e.target.files);
    }
  };

  const stopRecording = useCallback(() => {
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    setIsRecording(true);
    setInputValue('Listening...');

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: async () => {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                    const source = inputAudioContext.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
                    
                    scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        
                        sessionPromiseRef.current?.then((session) => {
                            session.sendRealtimeInput({ media: pcmBlob });
                        });
                    };
                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContext.destination);
                },
                onmessage: (message: LiveServerMessage) => {
                    const text = message.serverContent?.inputTranscription?.text;
                    if (text) {
                       setInputValue(prev => (prev === 'Listening...' ? text : prev + text));
                    }
                     if (message.serverContent?.turnComplete) {
                        stopRecording();
                     }
                },
                onerror: (e: ErrorEvent) => {
                    console.error('Live session error:', e);
                    setInputValue('Error during transcription. Please try again.');
                    stopRecording();
                },
                onclose: () => {},
            },
            config: {
                responseModalities: [Modality.AUDIO],
                inputAudioTranscription: {},
            },
        });

    } catch (error) {
        console.error('Failed to start recording:', error);
        setInputValue('Could not start microphone. Please check permissions.');
        setIsRecording(false);
    }
  }, [stopRecording]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (isRecording) {
        stopRecording();
      }
    };
  }, [isRecording, stopRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="relative">
            <textarea
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Ask a question or describe your analysis task..."
                className="w-full p-3 pr-32 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                rows={2}
                disabled={isLoading}
            />
            <div className="absolute top-1/2 right-3 transform -translate-y-1/2 flex items-center space-x-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*,video/*,application/pdf,.doc,.docx" />
                <button onClick={handleFileClick} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400" disabled={isLoading}>
                    <PaperclipIcon className="h-6 w-6" />
                </button>
                <button onClick={toggleRecording} className={`p-2 ${isRecording ? 'text-red-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'}`} disabled={isLoading}>
                    <MicIcon className="h-6 w-6" />
                </button>
                <button onClick={handleSend} className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 disabled:bg-blue-300" disabled={isLoading || !inputValue.trim()}>
                    <SendIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Press Shift+Enter for a new line.</span>
            <button onClick={onToggleComplexMode} className={`flex items-center space-x-1 p-1 rounded ${isComplexMode ? 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-gray-700' : ''}`}>
                <BrainIcon className="h-4 w-4" />
                <span>Thinking Mode {isComplexMode ? 'ON' : 'OFF'}</span>
            </button>
        </div>
    </div>
  );
};

export default ChatInput;