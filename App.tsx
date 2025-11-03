import React, { useState, useCallback, useEffect, useRef } from 'react';
import { makeSealedPdf } from './utils/sealPdf';
import Header from './components/Header';
import FilePanel from './components/FilePanel';
import ChatPanel from './components/ChatPanel';
import TaxServicePage from './components/TaxServicePage';
import BusinessServicesPage from './components/BusinessServicesPage';
import { ChatMessage, MessageAuthor, UploadedFile, FileType, SealingMetadata } from './types';
import { getDirectAnalysis, getPreliminaryAnalysis, synthesizeFinalReport, generateSimpleChat, verifyAnalysisWithGemini } from './services/geminiService';
import { verifyAnalysis, getPreliminaryAnalysisWithOpenAI } from './services/openAIService';
import { db as idb } from './services/db';
import { sha512OfFile } from './utils/hash';
import { getCurrentUser, db_firestore as firestore, storage } from './services/firebase';
import { ref, uploadBytes } from 'firebase/storage';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';


const APP_VERSION = '5.1.0';

// Helper to trigger file download
const downloadBlob = (data: Uint8Array, fileName: string, mimeType: string) => {
    const blob = new Blob([data], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// Helper function to convert markdown to plain text for PDF
const markdownToPlainText = (markdown: string): string => {
    return markdown
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
        .replace(/(\*|_)(.*?)\1/g, '$2')   // Italic
        .replace(/#+\s*(.*)/g, '$1')       // Headers
        .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Links
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Code
        .replace(/(\\n|^)- /g, '\n• ')        // Lists
        .replace(/(\\n|^)> /g, '\n');      // Blockquotes
};

const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = error => reject(error);
    });
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [loadingState, setLoadingState] = useState<'idle' | 'analyzing' | 'consulting' | 'synthesizing' | 'verifying'>('idle');
  const [isComplexMode, setIsComplexMode] = useState(false);
  const [isEnterpriseMode, setIsEnterpriseMode] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isFilePanelOpen, setIsFilePanelOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'firewall' | 'tax' | 'business'>('firewall'); // Page navigation state
  const isInitialLoad = useRef(true);
  const initialUserPrompt = useRef<string>('');
  
  // Load data from IndexedDB on initial render
  useEffect(() => {
    const loadData = async () => {
        const data = await idb.loadCase();
        if (data) {
            setMessages(data.messages);
            // Re-create File objects for in-memory use, though they can't be used for hashing again
            const loadedFiles = data.files.map(f => ({ ...f, file: new File([], f.name, { type: f.mimeType }) }));
            setUploadedFiles(loadedFiles);
        } else {
             setMessages([
                {
                    id: 'initial',
                    author: MessageAuthor.AI,
                    content: "Welcome to Verum Omnis V5. This system provides court-ready forensic analysis to support legal action, including self-representation. Upload your evidence and I will generate a formal report with drafted legal correspondence."
                }
            ]);
        }
    };
    loadData();
  }, []);

  // Save data to IndexedDB whenever messages or files change
  useEffect(() => {
      if (isInitialLoad.current) {
          isInitialLoad.current = false;
          return;
      }
      if (currentPage === 'firewall') {
        // We can't save the raw File object in IndexedDB, so we remove it before saving
        const filesToSave = uploadedFiles.map(({file, ...rest}) => rest);
        idb.saveCase(messages, filesToSave as any).catch(console.error);
      }
  }, [messages, uploadedFiles, currentPage]);


  useEffect(() => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            },
            (error) => {
                console.error("Error getting user location:", error);
            }
        );
    }
  }, []);

  const handleFilesChange = (files: FileList) => {
    const newFiles: UploadedFile[] = Array.from(files).map(file => {
      let type: FileType;
      if (file.type.startsWith('image/')) type = FileType.IMAGE;
      else if (file.type.startsWith('video/')) type = FileType.VIDEO;
      else if (file.type.startsWith('audio/')) type = FileType.AUDIO;
      else type = FileType.DOCUMENT;

      return {
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        type,
        mimeType: file.type,
        file,
        size: file.size,
        addedAt: new Date().toISOString(),
      };
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach(newFile => {
      sha512OfFile(newFile.file).then(hash => {
        setUploadedFiles(currentFiles => 
            currentFiles.map(f => f.id === newFile.id ? { ...f, sha512: hash } : f)
        );
      });
    });

    setMessages(prev => [...prev, {
        id: `file-upload-${Date.now()}`,
        author: MessageAuthor.SYSTEM,
        content: `${newFiles.length} file(s) added to case. Ready for analysis.`
    }]);
  };

  const handleSendMessage = useCallback(async (prompt: string) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      author: MessageAuthor.USER,
      content: prompt,
      files: uploadedFiles,
    };
    setMessages(prev => [...prev, userMessage]);
    
    const filesToAnalyze = await Promise.all(uploadedFiles.map(async f => ({
        ...f,
        base64: await getBase64(f.file)
    })));

    try {
        const lastMessage = messages[messages.length - 1];
        const isSynthesisRequest = lastMessage?.dualStrategies && (prompt.toLowerCase().includes('synthesize') || prompt.toLowerCase().includes('final report'));

        // Synthesis Flow for Complex Mode
        if (isComplexMode && isSynthesisRequest && lastMessage.dualStrategies) {
            setLoadingState('synthesizing');
            const finalReport = await synthesizeFinalReport(prompt, initialUserPrompt.current, filesToAnalyze, lastMessage.dualStrategies.gemini, lastMessage.dualStrategies.openai, isComplexMode, location);
            
            setLoadingState('verifying');
            const verificationNotes = await verifyAnalysis(initialUserPrompt.current, filesToAnalyze, finalReport);

            const aiMessage: ChatMessage = {
                id: `ai-synthesis-${Date.now()}`,
                author: MessageAuthor.AI,
                content: finalReport,
                verificationResult: { notes: verificationNotes, analyst: 'gemini', consultant: 'openai', verifier: 'openai' },
            };
            setMessages(prev => [...prev, aiMessage]);
            return;
        }

        // Simple Chat Flow (no files)
        if (filesToAnalyze.length === 0) {
            setLoadingState('analyzing');
            const response = await generateSimpleChat(prompt, location);
            const aiMessage: ChatMessage = { id: `ai-${Date.now()}`, author: MessageAuthor.AI, content: response.text };
            setMessages(prev => [...prev, aiMessage]);
            return;
        }
        
        // Conditional Analysis Flow (with files)
        if (isComplexMode) {
             // Dual Strategy Analysis Flow
            initialUserPrompt.current = prompt; // Store the first prompt of the session
            setLoadingState('analyzing');
            
            const [geminiResult, openAIResult] = await Promise.allSettled([
                getPreliminaryAnalysis(prompt, filesToAnalyze, isComplexMode, location),
                getPreliminaryAnalysisWithOpenAI(prompt, filesToAnalyze)
            ]);

            const geminiStrategy = geminiResult.status === 'fulfilled' ? geminiResult.value : `Gemini analysis failed: ${geminiResult.reason}`;
            const openAIStrategy = openAIResult.status === 'fulfilled' ? openAIResult.value : `OpenAI analysis failed: ${openAIResult.reason}`;

            if (geminiResult.status === 'rejected' && openAIResult.status === 'rejected') {
                throw new Error("Both Gemini and OpenAI analyses failed.");
            }

            const dualStrategyContent = `
### Dual AI Strategy Session
Both Gemini and OpenAI have analyzed the evidence and proposed independent strategies. Review both to determine the optimal path forward.

---
#### Gemini Strategy
${geminiStrategy}

---
#### OpenAI Strategy
${openAIStrategy}
---

You can now proceed by providing further instructions. For example: "Synthesize the best parts of both strategies into a final report."
`;

            const aiMessage: ChatMessage = {
                id: `ai-dual-${Date.now()}`,
                author: MessageAuthor.AI,
                content: dualStrategyContent,
                dualStrategies: { gemini: geminiStrategy, openai: openAIStrategy }
            };
            setMessages(prev => [...prev, aiMessage]);
        } else {
            // Streamlined Direct Analysis Flow
            setLoadingState('analyzing');
            const directReport = await getDirectAnalysis(prompt, filesToAnalyze, isComplexMode, location);
            
            setLoadingState('verifying');
            const verificationNotes = await verifyAnalysis(prompt, filesToAnalyze, directReport);

            const aiMessage: ChatMessage = {
                id: `ai-direct-${Date.now()}`,
                author: MessageAuthor.AI,
                content: directReport,
                verificationResult: { notes: verificationNotes, analyst: 'gemini', consultant: 'none', verifier: 'openai' },
            };
            setMessages(prev => [...prev, aiMessage]);
        }

    } catch (error) {
      console.error("Critical error in AI analysis pipeline:", error);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        author: MessageAuthor.AI,
        content: `I'm sorry, a critical error occurred in the AI analysis pipeline: ${(error as Error).message}. Please check the console for details and try again.`
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoadingState('idle');
    }
  }, [uploadedFiles, isComplexMode, location, messages]);
  
  const handleClearCase = () => { 
    setUploadedFiles([]); 
    setMessages([
        {
            id: 'initial-reset',
            author: MessageAuthor.AI,
            content: "Case file cleared. You can ask a question or upload new files to begin a new analysis."
        }
    ]);
    idb.clearCase();
    isInitialLoad.current = true; // allow next save
  };
  const handleToggleComplexMode = () => { setIsComplexMode(prev => !prev); };
  const handleToggleEnterpriseMode = () => { setIsEnterpriseMode(prev => !prev); };
  
    const performSealingProcess = async (messageId: string): Promise<{
        fileName: string;
        hash: string;
        cloudAnchor: SealingMetadata['cloudAnchor'];
        pdfBytes: Uint8Array;
        updatedContent: string;
    } | null> => {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return null;

        const message = messages[messageIndex];
        if (!message) return null;

        const now = new Date();
        const utcTimestamp = now.toISOString();
        const localTimestamp = now.toLocaleString(undefined, {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZoneName: 'short'
        });

        const evidence = uploadedFiles
            .filter(f => f.sha512)
            .map(f => ({ name: f.name, sha512: f.sha512! }));
        
        const pdfBytes = await makeSealedPdf({
            title: "Sealed Forensic Report",
            messagesHtml: markdownToPlainText(message.content),
            evidence,
            utcTimestamp,
            localTimestamp,
            appVersion: APP_VERSION,
        });

        const pdfHash = await stringToHash(pdfBytes);
        const fileName = `VO_Sealed_Report_${utcTimestamp.replace(/[:.]/g, '-')}.pdf`;
        let cloudAnchorResult: SealingMetadata['cloudAnchor'];

        try {
            const currentUser = await getCurrentUser();
            if (!currentUser) throw new Error("Authentication failed. Cannot seal report to the cloud.");

            const reportId = `report-${Date.now()}`;
            const storagePath = `users/${currentUser.uid}/reports/${fileName}`;
            const storageRef = ref(storage, storagePath);
            
            await uploadBytes(storageRef, pdfBytes);

            const firestoreId = reportId;
            const reportDocRef = doc(firestore, 'reports', firestoreId);
            await setDoc(reportDocRef, {
                userId: currentUser.uid,
                fileName,
                sha512: pdfHash,
                storagePath,
                createdAt: serverTimestamp(),
                originalPrompt: initialUserPrompt.current,
                fileCount: uploadedFiles.length,
            });

            cloudAnchorResult = { status: 'confirmed', storagePath, firestoreId };
        } catch (error) {
            console.error("Firebase sealing failed:", error);
            cloudAnchorResult = { status: 'failed', error: (error as Error).message };
        }

        const updatedMessages = [...messages];
        let newContent = message.content
            .replace(/\[Placeholder for SHA-512 hash of this report\]/g, pdfHash)
            .replace(/\[Placeholder for Cloud Anchor\]/g, cloudAnchorResult.storagePath || 'N/A')
            .replace(/\[Placeholder for Firestore Record\]/g, cloudAnchorResult.firestoreId || 'N/A');

        updatedMessages[messageIndex] = {
            ...message,
            content: newContent,
            sealingMetadata: {
                ...message.sealingMetadata!,
                sha512: pdfHash,
                cloudAnchor: cloudAnchorResult,
            },
        };
        setMessages(updatedMessages);

        return { fileName, hash: pdfHash, cloudAnchor: cloudAnchorResult, pdfBytes, updatedContent: newContent };
    };

    const handleSealReport = async (messageId: string) => {
        const sealResult = await performSealingProcess(messageId);
        if (sealResult) {
            downloadBlob(sealResult.pdfBytes, sealResult.fileName, 'application/pdf');
        }
    };

    const handleSealAndEmailReport = async (messageId: string) => {
        const sealResult = await performSealingProcess(messageId);
        if (!sealResult) return;

        downloadBlob(sealResult.pdfBytes, sealResult.fileName, 'application/pdf');

        const recipient = 'submissions@verum-foundation.org';
        const subject = `Verum Omnis Sealed Report Submission - Case ID ${Date.now()}`;
        
        const now = new Date();
        const localTimestampForEmail = now.toLocaleString(undefined, {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
        });

        const extractSection = (markdown: string, sectionTitle: string): string => {
            const regex = new RegExp(`## ${sectionTitle}\\n([\\s\\S]*?)(?=\\n##|$)`, 'i');
            const match = markdown.match(regex);
            return match ? markdownToPlainText(match[1].trim()) : 'Not found in report.';
        };

        const keyFindings = extractSection(sealResult.updatedContent, 'Key Findings');
        const contradictions = extractSection(sealResult.updatedContent, 'Contradictions & Risks');
        const nextSteps = extractSection(sealResult.updatedContent, 'Next Steps');

        const body = `
Dear Counsel,

Please find the sealed forensic report attached, generated by the Verum Omnis V5 AI.

The analysis has highlighted several key areas that require your attention. Below is a summary extracted directly from the report for your convenience.

---
**Key Findings:**
${keyFindings}
---
**Contradictions & Risks Identified:**
${contradictions}
---
**Suggested Next Steps:**
${nextSteps}
---

**Sealing Metadata:**
- Report Filename: ${sealResult.fileName}
- Certified SHA-512 Hash of PDF: ${sealResult.hash}
- Timestamp: ${localTimestampForEmail} (UTC: ${now.toISOString()})
- Cloud Anchor: ${sealResult.cloudAnchor?.storagePath || 'Failed to anchor'}
- Case Files Analyzed: ${uploadedFiles.map(f => f.name).join(', ') || 'N/A'}
---

This report has been certified by Verum Omnis V5. To preserve the integrity of the hash, please do not modify the attached file.

We await your response on the matters raised.

Regards,
Verum Omnis User
`;
        window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        alert(`Your PDF report "${sealResult.fileName}" has been downloaded.\n\nPlease remember to manually attach this file to the email draft that has just opened.`);
    };
  
    // Helper function to generate SHA-512 hash of a byte array
    const stringToHash = async (data: Uint8Array): Promise<string> => {
        const hashBuffer = await crypto.subtle.digest('SHA-512', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };


  const renderFirewallPage = () => (
    <div className="flex flex-row flex-grow overflow-hidden">
        <FilePanel 
          files={uploadedFiles} 
          onClearCase={handleClearCase}
          isOpen={isFilePanelOpen}
          onClose={() => setIsFilePanelOpen(false)}
        />
        <main className="flex-grow h-full overflow-hidden">
          <ChatPanel 
            messages={messages}
            onSendMessage={handleSendMessage}
            onFilesChange={handleFilesChange}
            onSealReport={handleSealReport}
            onSealAndEmailReport={handleSealAndEmailReport}
            loadingState={loadingState}
            isComplexMode={isComplexMode}
            onToggleComplexMode={handleToggleComplexMode}
            isEnterpriseMode={isEnterpriseMode}
          />
        </main>
    </div>
  );
  
  const renderCurrentPage = () => {
    switch (currentPage) {
        case 'tax':
            return <TaxServicePage />;
        case 'business':
            return <BusinessServicesPage />;
        case 'firewall':
        default:
            return renderFirewallPage();
    }
  };


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header 
        isEnterpriseMode={isEnterpriseMode} 
        onToggleEnterpriseMode={handleToggleEnterpriseMode}
        onToggleFilePanel={() => setIsFilePanelOpen(p => !p)}
        onNavigateToFirewall={() => setCurrentPage('firewall')}
        onNavigateToTax={() => setCurrentPage('tax')}
        onNavigateToBusiness={() => setCurrentPage('business')}
      />
      {renderCurrentPage()}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        padding: '8px 12px', fontSize: 12, textAlign: 'center',
        background: 'rgba(0,0,0,0.85)', color: '#fff', zIndex: 9999
      }}>
        Free for private people. Institutions & companies: trial access applies; fees apply after the trial.
      </div>
    </div>
  );
};

export default App;