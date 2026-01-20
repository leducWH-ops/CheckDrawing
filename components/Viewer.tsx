import React, { useState, useRef, useEffect } from 'react';
import { DrawingFile, DrawingError, Language } from '../types';

interface ViewerProps {
  drawing: DrawingFile;
  language: Language;
  onScan: () => void;
  activeErrorId: number | null;
  onErrorClick: (id: number) => void;
}

const Viewer: React.FC<ViewerProps> = ({ drawing, language, onScan, activeErrorId, onErrorClick }) => {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset zoom when drawing changes
  useEffect(() => {
    setScale(1);
  }, [drawing.id]);

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.min(Math.max(0.2, s * delta), 5));
    }
  };

  const getMarkerStyle = (box: any) => {
    if (!box) return { display: 'none' };
    const { ymin, xmin, ymax, xmax } = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
    };
  };

  return (
    <div className="flex h-full w-full bg-slate-100 overflow-hidden">
      
      {/* Center - Image Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-auto flex items-center justify-center p-8 cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
      >
        <div 
          className="relative shadow-2xl bg-white transition-transform duration-100 ease-out"
          style={{ transform: `scale(${scale})`, transformOrigin: 'center top' }}
        >
          <img 
            ref={imageRef}
            src={drawing.imageUrl} 
            alt="Drawing" 
            className="max-w-none block select-none"
            style={{ maxHeight: '85vh' }}
          />
          
          {/* Overlays */}
          {drawing.errors.map((error) => (
            error.box_2d && (
              <div
                key={error.id}
                onClick={() => onErrorClick(error.id)}
                className={`absolute border-2 transition-all cursor-pointer group z-10 
                  ${activeErrorId === error.id ? 'border-red-600 bg-red-500/10 z-50 shadow-[0_0_15px_rgba(239,68,68,0.8)]' : 'border-red-500 hover:border-red-400 hover:bg-red-500/5'}
                `}
                style={getMarkerStyle(error.box_2d)}
              >
                 {/* Floating Number Badge */}
                <div className={`
                    absolute -top-4 -left-1 flex items-center justify-center text-white font-bold text-xs rounded shadow-sm px-1.5 py-0.5
                    ${activeErrorId === error.id ? 'bg-red-700 scale-125' : 'bg-red-600'}
                `}>
                  {error.id}
                </div>
              </div>
            )
          ))}
        </div>

        {/* Floating Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 border border-slate-200">
           <button onClick={() => setScale(s => s - 0.1)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
             <i className="fa-solid fa-minus"></i>
           </button>
           <span className="w-12 text-center text-sm font-mono self-center">{Math.round(scale * 100)}%</span>
           <button onClick={() => setScale(s => s + 0.1)} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-600">
             <i className="fa-solid fa-plus"></i>
           </button>
           <div className="w-px h-6 bg-slate-300 mx-2 self-center"></div>
           <button onClick={() => setScale(1)} className="text-xs text-blue-600 font-medium hover:underline self-center">Reset</button>
        </div>
      </div>

      {/* Right - Comment Panel */}
      <div className="w-80 bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">
             <i className="fa-regular fa-comments mr-2 text-blue-500"></i>
             {language === 'en' ? 'Review Comments' : 'Ghi chú rà soát'}
          </h3>
          <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-mono">
            {drawing.errors.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {drawing.errors.length === 0 && (
            <div className="text-center mt-10 text-slate-400">
                {language === 'en' ? 'No errors detected yet.' : 'Chưa phát hiện lỗi.'}
                <br/>
                <button 
                    onClick={onScan}
                    className="mt-4 text-blue-600 hover:text-blue-700 underline text-sm"
                >
                    {language === 'en' ? 'Run AI Scan' : 'Chạy AI Scan'}
                </button>
            </div>
          )}

          {drawing.errors.map((error) => (
            <div 
              key={error.id}
              onClick={() => onErrorClick(error.id)}
              className={`
                p-3 rounded-lg border text-sm transition-all cursor-pointer relative
                ${activeErrorId === error.id 
                    ? 'bg-red-50 border-red-400 shadow-md ring-1 ring-red-200' 
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
              `}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-red-100 text-red-600 font-bold rounded text-xs mt-0.5">
                  {error.id}
                </span>
                <div className="flex-1">
                  <p className="text-slate-800 leading-snug">
                    {language === 'en' ? error.description_en : error.description_vn}
                  </p>
                  {error.type === 'critical' && (
                     <span className="inline-block mt-2 text-[10px] uppercase font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">Critical</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Viewer;