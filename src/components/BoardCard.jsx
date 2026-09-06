import React from 'react';

export default function BoardCard({ board, index, onSelect, onDragStart, onDragOver, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(board.id)}
      className={`cursor-pointer rounded-2xl p-6 border-2 bg-white shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between aspect-square ${
        board.isOwner ? 'border-blue-400 hover:border-blue-600' : 'border-orange-400 hover:border-orange-600'
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <span className={`inline-block text-xs px-3 py-1 rounded-full font-bold border ${
            board.isOwner ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'
          }`}>
            {board.isOwner ? 'Proprietario' : 'Condivisa con me'}
          </span>
          <span className="text-slate-400 text-sm font-bold">⋮⋮</span>
        </div>
        <h3 className="font-bold text-slate-900 text-lg leading-snug">{board.title}</h3>
      </div>

      <div className="text-xs text-slate-500 border-t border-slate-100 pt-3 flex justify-between items-center">
        <span className="truncate max-w-[130px]">👤 <strong className="text-slate-700 font-semibold">{board.ownerEmail}</strong></span>
        <span className="text-blue-600 font-bold text-sm">Apri →</span>
      </div>
    </div>
  );
}