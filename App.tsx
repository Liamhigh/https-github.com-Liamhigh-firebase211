import React, { useState, useCallback, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import Header from './components/Header';
import FilePanel from './components/FilePanel';
import ChatPanel from './components/ChatPanel';
import TaxServicePage from './components/TaxServicePage';
import BusinessServicesPage from './components/BusinessServicesPage';
import { ChatMessage, MessageAuthor, UploadedFile, FileType } from './types';
import { getPreliminaryAnalysis, synthesizeFinalReport, generateSimpleChat, verifyAnalysisWithGemini } from './services/geminiService';
import { verifyAnalysis, getPreliminaryAnalysisWithOpenAI } from './services/openAIService';
import { db } from './services/db';

// Helper function to generate SHA-512 hash
const stringToHash = async (str: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-512', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper function to render markdown to PDF with basic formatting
const renderMarkdownToPdf = (doc: jsPDF, markdown: string) => {
    const lines = markdown.split('\n');
    let y = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const contentWidth = doc.internal.pageSize.width - margin * 2;

    const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    lines.forEach(line => {
        line = line.trim();
        let textHeight = 5; // Default line height

        if (line.startsWith('## ')) {
            checkPageBreak(12);
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text(line.substring(3), margin, y);
            y += 12;
        } else if (line.startsWith('### ')) {
            checkPageBreak(10);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(line.substring(4), margin, y);
            y += 10;
        } else if (line.startsWith('* ') || line.startsWith('- ')) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const bulletText = `• ${line.substring(2)}`;
            const splitText = doc.splitTextToSize(bulletText, contentWidth - 5);
            textHeight = splitText.length * 5;
            checkPageBreak(textHeight);
            doc.text(splitText, margin + 5, y);
            y += textHeight;
        } else if (line.trim() === '---' || line.trim() === '') {
             y += 5;
        } else if (line.length > 0) {
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const splitText = doc.splitTextToSize(line, contentWidth);
            textHeight = splitText.length * 5;
            checkPageBreak(textHeight);
            doc.text(splitText, margin, y);
            y += textHeight;
        }
    });
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
        const data = await db.loadCase();
        if (data) {
            setMessages(data.messages);
            setUploadedFiles(data.files);
        } else {
             setMessages([
                {
                    id: 'initial',
                    author: MessageAuthor.AI,
                    content: "Welcome to Verum Omnis V5. Please upload your case files and ask a question to begin the triple-verified analysis. For example: 'Summarize the attached evidence and highlight any contradictions.'"
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
        db.saveCase(messages, uploadedFiles).catch(console.error);
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

  const fileToUploadedFile = (file: File): UploadedFile => {
      let type: FileType;
      if (file.type.startsWith('image/')) type = FileType.IMAGE;
      else if (file.type.startsWith('video/')) type = FileType.VIDEO;
      else if (file.type.startsWith('audio/')) type = FileType.AUDIO;
      else type = FileType.DOCUMENT;

      return {
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        type,
        mimeType: file.type,
        file,
        size: file.size,
      }
  };

  const handleFilesChange = (files: FileList) => {
    const newFiles = Array.from(files).map(fileToUploadedFile);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setMessages(prev => [...prev, {
        id: `file-upload-${Date.now()}`,
        author: MessageAuthor.SYSTEM,
        content: `${newFiles.length} file(s) added to case. Ready for analysis.`
    }])
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

        // Synthesis Flow
        if (isSynthesisRequest && lastMessage.dualStrategies) {
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

        // Dual Strategy Analysis Flow (with files)
        initialUserPrompt.current = prompt; // Store the first prompt of the session
        setLoadingState('analyzing');
        
        const [geminiResult, openAIResult] = await Promise.allSettled([
            getPreliminaryAnalysis(prompt, filesToAnalyze, isComplexMode, location),
            getPreliminaryAnalysisWithOpenAI(prompt, filesToAnalyze.filter(f => f.type === FileType.IMAGE))
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
            content: "Case file cleared. You can now begin a new analysis."
        }
    ]);
    db.clearCase();
    isInitialLoad.current = true; // allow next save
  };
  const handleToggleComplexMode = () => { setIsComplexMode(prev => !prev); };
  const handleToggleEnterpriseMode = () => { setIsEnterpriseMode(prev => !prev); };
  
  const generateSealedPdf = async (message: ChatMessage): Promise<{ doc: jsPDF, hash: string }> => {
    const hash = await stringToHash(message.content);
    const createdAt = new Date().toISOString();
    const fileCount = uploadedFiles.length;
    
    const qrMetaData = JSON.stringify({
        createdAt, fileCount, hash: hash.substring(0, 16) + '...'
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrMetaData);
    const contentWithHash = message.content.replace(/\[Placeholder for SHA-512 hash of this report\]/g, hash);

    const doc = new jsPDF();
    renderMarkdownToPdf(doc, contentWithHash);

    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text('Verum Omnis Patent Pending ✔', 15, doc.internal.pageSize.height - 10);
        doc.addImage(qrCodeDataUrl, 'JPEG', doc.internal.pageSize.width - 35, doc.internal.pageSize.height - 35, 25, 25);
    }
    return { doc, hash };
  };

  const handleSealReport = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    const { doc } = await generateSealedPdf(message);
    doc.save(`Verum_Omnis_Report_${Date.now()}.pdf`);
  };

  const handleSealAndEmailReport = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    const { doc, hash } = await generateSealedPdf(message);

    // First, save the file for the user to attach
    doc.save(`Verum_Omnis_Report_${Date.now()}.pdf`);

    // Then, open the mail client
    const recipient = 'submissions@verum-foundation.org'; // Placeholder email
    const subject = `Verum Omnis Sealed Report Submission - Case ID ${Date.now()}`;
    const body = `
Please find the sealed forensic report attached.

--- Sealing Metadata ---
Certified SHA-512 Hash: ${hash}
Timestamp (UTC): ${new Date().toISOString()}
Case Files Analyzed: ${uploadedFiles.map(f => f.name).join(', ') || 'N/A'}
---

This report has been certified by Verum Omnis V5. Please do not modify the attached file to preserve the integrity of the hash.

Regards,
Verum Omnis User
`;
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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
    </div>
  );
};

export default App;