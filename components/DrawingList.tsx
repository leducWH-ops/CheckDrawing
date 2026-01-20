import React from 'react';
import { DrawingFile, ScanStatus } from '../types';

interface DrawingListProps {
  drawings: DrawingFile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const DrawingList: React.FC<DrawingListProps> = ({ drawings, selectedId, onSelect, onDelete }) => {
  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-2">
      {drawings.length === 0 && (
        <div className="text-slate-400 text-sm text-center py-10 italic">
          No drawings uploaded
        </div>
      )}
      {drawings.map((drawing) => (
        <div
          key={drawing.id}
          onClick={() => onSelect(drawing.id)}
          className={`
            group flex items-center p-3 rounded-lg cursor-pointer border transition-all
            ${selectedId === drawing.id 
              ? 'bg-blue-50 border-blue-500 shadow-sm' 
              : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
          `}
        >
          {/* Thumbnail Preview */}
          <div className="w-12 h-12 rounded bg-slate-200 overflow-hidden flex-shrink-0 mr-3 border border-slate-300 relative">
            <img src={drawing.imageUrl} alt="thumb" className="w-full h-full object-cover" />
            {drawing.status === ScanStatus.COMPLETED && drawing.errors.length > 0 && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[8px] px-1 font-bold">
                    {drawing.errors.length}
                </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-slate-700 truncate" title={drawing.name}>
              {drawing.name}
            </h4>
            <div className="flex items-center mt-1">
               {getStatusBadge(drawing.status, drawing.errors.length)}
            </div>
          </div>

          {/* Delete Action */}
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(drawing.id); }}
            className="ml-2 p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      ))}
    </div>
  );
};

const getStatusBadge = (status: ScanStatus, errorCount: number) => {
  switch (status) {
    case ScanStatus.PENDING:
      return <span className="text-xs text-slate-500"><i className="fa-regular fa-clock mr-1"></i>Pending</span>;
    case ScanStatus.SCANNING:
      return <span className="text-xs text-blue-600 animate-pulse"><i className="fa-solid fa-spinner fa-spin mr-1"></i>Scanning...</span>;
    case ScanStatus.COMPLETED:
      return errorCount > 0 
        ? <span className="text-xs text-red-600 font-semibold"><i className="fa-solid fa-triangle-exclamation mr-1"></i>{errorCount} Issues</span>
        : <span className="text-xs text-green-600 font-semibold"><i className="fa-solid fa-check mr-1"></i>Clean</span>;
    case ScanStatus.ERROR:
      return <span className="text-xs text-red-500"><i className="fa-solid fa-circle-xmark mr-1"></i>Failed</span>;
  }
};

export default DrawingList;