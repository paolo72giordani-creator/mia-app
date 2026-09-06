import React from 'react';

export default function BoardCard({ board, index, onSelect, onDragStart, onDragOver, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onClick={() => onSelect(board.id)}
      className={`cursor-pointer rounded-lg p-3 border bg-white shadow-sm hover:shadow transition ${
        board.isOwner ? 'border-blue-400' : 'border-orange-400'
      }`}
    >
      <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-semibold mb-1.5 ${
        board.isOwner ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
      }`}>
        {board.isOwner ? 'Proprietario' : 'Condivisa'}
      </span>
      <h3 className="font-bold text-slate-800 text-xs mb-2">{board.title}</h3>
      <div className="text-[10px] text-slate-400 border-t pt-1.5 flex justify-between">
        <span>👤 {board.ownerEmail}</span>
        <span className="text-blue-500 font-medium">Apri →</span>
      </div>
    </div>
  );
}