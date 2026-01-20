import React, { useState, useEffect, useRef } from 'react';
import DrawingList from './components/DrawingList';
import Viewer from './components/Viewer';
import { analyzeDrawing } from './services/geminiService';
import { convertPdfToImages, getBase64Data, drawErrorsOnCanvas } from './utils/pdfUtils';
import { DrawingFile, ScanStatus, Language } from './types';

const App: React.FC = () => {
  const [drawings, setDrawings] = useState<DrawingFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeErrorId, setActiveErrorId] = useState<number | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedDrawing = drawings.find(d => d.id === selectedId);

  // File Upload Handler
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newDrawings: DrawingFile[] = [];

    for (const file of Array.from(files) as File[]) {
      const baseId = Math.random().toString(36).substr(2, 9);
      
      if (file.type === 'application/pdf') {
        try {
          const images = await convertPdfToImages(file);
          images.forEach((imgData, idx) => {
            newDrawings.push({
              id: `${baseId}_${idx}`,
              name: `${file.name} - Page ${idx + 1}`,
              fileType: 'pdf',
              imageUrl: imgData,
              originalFile: file,
              status: ScanStatus.PENDING,
              errors: [],
              pageIndex: idx,
              totalPages: images.length
            });
          });
        } catch (err) {
            console.error("PDF conversion failed", err);
            alert("Failed to process PDF. Please try an image.");
        }
      } else if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        newDrawings.push({
          id: baseId,
          name: file.name,
          fileType: 'image',
          imageUrl: url,
          originalFile: file,
          status: ScanStatus.PENDING,
          errors: [],
        });
      }
    }

    setDrawings(prev => [...prev, ...newDrawings]);
    if (newDrawings.length > 0 && !selectedId) {
      setSelectedId(newDrawings[0].id);
    }
    // Clear input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // AI Scan Logic
  const handleScan = async (id: string) => {
    const drawing = drawings.find(d => d.id === id);
    if (!drawing) return;

    // Update Status
    setDrawings(prev => prev.map(d => d.id === id ? { ...d, status: ScanStatus.SCANNING } : d));

    try {
      // Get base64 string
      let base64 = "";
      if (drawing.imageUrl.startsWith('data:')) {
        base64 = getBase64Data(drawing.imageUrl);
      } else if (drawing.originalFile) {
        // Fallback for object URLs created from files (though for PDF flow we use DataURL)
        const reader = new FileReader();
        base64 = await new Promise((resolve) => {
             const r = new FileReader();
             r.readAsDataURL(drawing.originalFile!);
             r.onload = () => resolve((r.result as string).split(',')[1]);
        });
      }

      const errors = await analyzeDrawing(base64);
      
      setDrawings(prev => prev.map(d => d.id === id ? { 
        ...d, 
        status: ScanStatus.COMPLETED, 
        errors: errors 
      } : d));
      
      return true;
    } catch (error) {
      console.error(error);
      alert("Failed to call the Gemini API. Please check your network or API Key.");
      setDrawings(prev => prev.map(d => d.id === id ? { ...d, status: ScanStatus.ERROR } : d));
      return false;
    }
  };

  // Auto Scan Next Logic
  const scanAll = async () => {
    setIsProcessingAll(true);
    for (const drawing of drawings) {
      if (drawing.status === ScanStatus.PENDING || drawing.status === ScanStatus.ERROR) {
        setSelectedId(drawing.id); // Auto switch view
        await handleScan(drawing.id);
        // Small delay for UI update
        await new Promise(r => setTimeout(r, 500));
      }
    }
    setIsProcessingAll(false);
  };

  const handleExport = async () => {
    const completedDrawings = drawings.filter(d => d.status === ScanStatus.COMPLETED && d.errors.length > 0);
    
    if (completedDrawings.length === 0) {
        alert(language === 'en' ? "No completed drawings to export." : "Không có bản vẽ hoàn thành để xuất.");
        return;
    }

    // Process export - Generate merged images
    if (selectedDrawing) {
        const markedImage = await drawErrorsOnCanvas(selectedDrawing.imageUrl, selectedDrawing.errors, language);
        const link = document.createElement('a');
        link.href = markedImage;
        link.download = `checked_${selectedDrawing.name.replace(/\s/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  };

  const handleDelete = (id: string) => {
      setDrawings(prev => prev.filter(d => d.id !== id));
      if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      
      {/* Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shadow-sm z-30">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded font-bold text-lg leading-none">D-</div>
          <h1 className="font-bold text-slate-800 text-lg tracking-tight">Drawing Checking</h1>
        </div>

        <div className="flex items-center gap-3">
            {/* AI Controls */}
            {drawings.length > 0 && (
                <button 
                    onClick={scanAll}
                    disabled={isProcessingAll}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors
                        ${isProcessingAll 
                            ? 'bg-blue-100 text-blue-700 cursor-wait' 
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-blue-500/30'}
                    `}
                >
                    {isProcessingAll ? (
                        <><i className="fa-solid fa-circle-notch fa-spin"></i> Processing...</>
                    ) : (
                        <><i className="fa-solid fa-wand-magic-sparkles"></i> AI Scan All</>
                    )}
                </button>
            )}

            {/* Language Switch */}
            <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
                <button 
                    onClick={() => setLanguage('vi')} 
                    className={`px-3 py-0.5 rounded text-xs font-bold transition-all ${language === 'vi' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    VN
                </button>
                <button 
                    onClick={() => setLanguage('en')} 
                    className={`px-3 py-0.5 rounded text-xs font-bold transition-all ${language === 'en' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    EN
                </button>
            </div>
            
            {/* Export */}
             <button 
                onClick={handleExport}
                className="text-slate-600 hover:text-slate-900 px-3 py-1 text-sm border border-slate-300 rounded hover:bg-slate-50"
                title="Export Image with Marks"
             >
                <i className="fa-solid fa-file-export mr-2"></i>Export
            </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-20">
          <div className="p-4 border-b border-slate-200">
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 px-4 border-2 border-dashed border-blue-300 rounded-lg bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
             >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                Upload PDF/Image
             </button>
             <input 
                type="file" 
                multiple 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept="image/*,application/pdf"
            />
          </div>
          
          <DrawingList 
             drawings={drawings} 
             selectedId={selectedId} 
             onSelect={setSelectedId}
             onDelete={handleDelete}
          />
        </aside>

        {/* Main View */}
        <main className="flex-1 relative">
           {selectedDrawing ? (
             <Viewer 
                drawing={selectedDrawing}
                language={language}
                onScan={() => handleScan(selectedDrawing.id)}
                activeErrorId={activeErrorId}
                onErrorClick={setActiveErrorId}
             />
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-24 h-24 bg-slate-200 rounded-full flex items-center justify-center mb-4 text-4xl">
                    <i className="fa-regular fa-folder-open"></i>
                </div>
                <p>Select or upload a drawing to start checking.</p>
             </div>
           )}
        </main>
      </div>
    </div>
  );
};

export default App;