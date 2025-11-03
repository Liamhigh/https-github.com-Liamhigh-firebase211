import React from 'react';
import { UploadedFile } from '../types';
import { FileIcon } from './Icons';

interface FilePanelProps {
  files: UploadedFile[];
  onClearCase: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const FilePanel: React.FC<FilePanelProps> = ({ files, onClearCase, isOpen, onClose }) => {
  return (
    <>
      {/* Backdrop for mobile */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div 
        className={`
          w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shrink-0
          fixed md:relative top-0 left-0 z-40 md:z-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white">Case Files</h2>
          <button onClick={onClose} className="p-1 text-gray-500 dark:text-gray-400 md:hidden" aria-label="Close file panel">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-2">
          {files.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 p-4 text-sm">
              Upload documents, images, audio, or video to begin analysis.
            </div>
          ) : (
            <ul>
              {files.map((file) => (
                <li key={file.id} className="flex items-center p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700">
                  <FileIcon className="h-5 w-5 mr-3 text-gray-500 dark:text-gray-400" />
                  <div className="truncate">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
          {files.length > 0 && (
              <button 
                onClick={onClearCase}
                className="w-full mb-4 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none"
              >
                Clear & Reset Case
              </button>
            )}
          <p>All files are processed in-memory and stored on this device. Your session is private.</p>
        </div>
      </div>
    </>
  );
};

export default FilePanel;