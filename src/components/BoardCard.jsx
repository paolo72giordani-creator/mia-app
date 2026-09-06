import React from 'react';

export default function BoardCard({ board, index, onSelect, onDragStart, onDragOver, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(board.id)}
      className={`cursor-pointer rounded-xl p-5 border-2 bg-white shadow-sm hover:shadow-md transition-all duration-150 flex flex-col justify-between min-h-[130px] ${
        board.isOwner ? 'border-blue-400/80 hover:border-blue-500' : 'border-orange-400/80 hover:border-orange-500'
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-2">
          <span className={`inline-block text-[11px] px-2.5 py-0.5 rounded-full font-semibold border ${
            board.isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
          }`}>
            {board.isOwner ? 'Proprietario' : 'Condivisa con me'}
          </span>
          <span className="text-slate-300 text-xs">⋮⋮</span>
        </div>
        <h3 className="font-bold text-slate-900 text-sm mb-1 leading-snug">{board.title}</h3>
      </div>

      <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5 flex justify-between items-center mt-3">
        <span>👤 <strong className="text-slate-700 font-medium">{board.ownerEmail}</strong></span>
        <span className="text-blue-600 font-semibold">Apri →</span>
      </div>
    </div>
  );
}