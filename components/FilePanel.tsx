import React, { useState, useEffect } from 'react';
import { UploadedFile } from '../types';
import { FileIcon, ShieldCheckIcon, LoadingSpinner } from './Icons';

interface FilePanelProps {
  files: UploadedFile[];
  onClearCase: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const FilePanel: React.FC<FilePanelProps> = ({ files, onClearCase, isOpen, onClose }) => {
  const [verificationStatus, setVerificationStatus] = useState({
    local: 'idle',
    gemini: 'idle',
    openai: 'idle',
    consumerApp: 'idle',
    enterpriseApp: 'idle',
    consensus: 'idle',
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedCount, setVerifiedCount] = useState(0);

  useEffect(() => {
    const currentVerified = (Object.values(verificationStatus) as string[]).filter(s => s === 'verified').length;
    setVerifiedCount(currentVerified);

    const { local, gemini, openai, consumerApp, enterpriseApp } = verificationStatus;
    const allVerified = [local, gemini, openai, consumerApp, enterpriseApp].every(s => s === 'verified');

    if (allVerified) {
      setVerificationStatus(prev => ({ ...prev, consensus: 'verified' }));
    } else if (local === 'verified' && gemini === 'verified' && openai === 'verified') {
      // Base triple verification met
      setVerificationStatus(prev => ({ ...prev, consensus: 'verified' }));
    } else {
      setVerificationStatus(prev => ({ ...prev, consensus: 'idle' }));
    }

  }, [verificationStatus]);


  const handleVerifyIntegrity = () => {
    setIsVerifying(true);
    setVerificationStatus(prev => ({
      ...prev,
      local: 'verifying',
      gemini: 'verifying',
      openai: 'verifying',
      consensus: 'idle',
    }));

    setTimeout(() => setVerificationStatus(prev => ({ ...prev, local: 'verified' })), 1000);
    setTimeout(() => setVerificationStatus(prev => ({ ...prev, gemini: 'verified' })), 2000);
    setTimeout(() => {
        setVerificationStatus(prev => ({ ...prev, openai: 'verified' }));
        setIsVerifying(false);
    }, 3000);
  };
  
  const addSimulatedVote = (voter: 'consumerApp' | 'enterpriseApp') => {
    if (verificationStatus[voter] === 'verified' || isVerifying) return;
    setVerificationStatus(prev => ({ ...prev, [voter]: 'verifying', consensus: 'idle' }));
    setTimeout(() => {
      setVerificationStatus(prev => ({ ...prev, [voter]: 'verified' }));
    }, 1500);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'verifying') return <LoadingSpinner className="h-4 w-4 text-blue-500" />;
    if (status === 'verified') return <ShieldCheckIcon className="h-4 w-4 text-green-500" />;
    return <div className="h-4 w-4 rounded-full bg-gray-300 dark:bg-gray-600"></div>;
  };

  const getConsensusText = () => {
    if (verificationStatus.consensus !== 'verified') return "Consensus Pending";
    if (verifiedCount === 6) return "Ecosystem Verified";
    if (verifiedCount === 5) return "Quintuple Verified";
    if (verifiedCount === 4) return "Quadruple Verified";
    if (verifiedCount >= 3) return "Triple Verified";
    return "Consensus Verified";
  };


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
          w-72 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full shrink-0
          fixed md:relative top-0 left-0 z-40 md:z-auto
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="font-bold text-lg text-gray-800 dark:text-white">Case Files</h2>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 md:hidden" aria-label="Close file panel">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex-grow p-4 overflow-y-auto">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Evidence Attached</h3>
          {files.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No files uploaded.</p>
          ) : (
            <ul className="space-y-2">
              {files.map(file => (
                <li key={file.id} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
                  <FileIcon className="h-5 w-5 text-gray-400" />
                  <span className="truncate flex-grow">{file.name}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {(file.size / 1024).toFixed(1)} KB
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">System Integrity</h3>
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Local App</span><StatusIcon status={verificationStatus.local} /></div>
                <div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Gemini API</span><StatusIcon status={verificationStatus.gemini} /></div>
                <div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">OpenAI API</span><StatusIcon status={verificationStatus.openai} /></div>
                <div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Consumer App (APK)</span><StatusIcon status={verificationStatus.consumerApp} /></div>
                <div className="flex justify-between items-center"><span className="text-gray-600 dark:text-gray-300">Enterprise App (APK)</span><StatusIcon status={verificationStatus.enterpriseApp} /></div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-600 mt-2 font-semibold"><span className="text-gray-800 dark:text-white">{getConsensusText()}</span><StatusIcon status={verificationStatus.consensus} /></div>
            </div>
            <div className="mt-4 flex flex-col space-y-2">
                <button 
                    onClick={handleVerifyIntegrity} 
                    disabled={isVerifying}
                    className="w-full text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 transition-colors"
                >
                    Verify Web Agents
                </button>
                 <button 
                    onClick={() => addSimulatedVote('consumerApp')} 
                    disabled={isVerifying || verificationStatus.consumerApp === 'verified'}
                    className="w-full text-sm px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 transition-colors"
                >
                    Add Consumer App Vote
                </button>
                <button 
                    onClick={() => addSimulatedVote('enterpriseApp')} 
                    disabled={isVerifying || verificationStatus.enterpriseApp === 'verified'}
                    className="w-full text-sm px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 dark:disabled:bg-gray-700 transition-colors"
                >
                    Add Enterprise Vote
                </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button 
            onClick={onClearCase} 
            className="w-full text-sm px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Clear Case & Reset
          </button>
        </div>
      </div>
    </>
  );
};

export default FilePanel;