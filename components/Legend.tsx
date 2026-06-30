import React from 'react';
import { EmotionalKeyData } from '../types';

interface LegendProps {
  data: EmotionalKeyData[];
  selectedId: number | null;
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onSelect: (id: number) => void;
}

const Legend: React.FC<LegendProps> = ({ data, selectedId, hoveredId, onHover, onSelect }) => {
  return (
    <div className="w-full mt-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-2 text-xs">
        {data.map((item) => {
          // Determine if this item is the "active" one based on hover or selection
          const isHovered = hoveredId === item.id;
          const isSelected = selectedId === item.id;
          
          // Logic: 
          // 1. If user is hovering something, highlight that.
          // 2. If user is NOT hovering anything, highlight the selected item.
          const isActive = isHovered || (hoveredId === null && isSelected);
          
          // If something is highlighted (hovered or selected) and it's NOT this item, dim this item.
          // However, if we are just in "selection mode" (hoveredId is null), we want the selected item active, 
          // and others slightly dimmed or normal depending on preference. 
          // Let's dim others if something is specifically hovered OR selected.
          const isDimmed = (hoveredId !== null || selectedId !== null) && !isActive;

          return (
            <div
              key={item.id}
              className={`
                flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200 border border-transparent
                ${isActive ? 'bg-white/10 border-white/10 shadow-sm' : 'hover:bg-white/5 hover:border-white/5'}
                ${isDimmed ? 'opacity-40 grayscale-[0.5]' : 'opacity-100'}
              `}
              onMouseEnter={() => onHover(item.id)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onSelect(item.id)}
            >
              <div 
                className={`w-3 h-3 rounded-full shadow-inner bg-gradient-to-br ${item.tailwindGradient}`} 
              />
              <div className="flex flex-col min-w-0">
                <span className={`font-bold leading-none ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {item.musicalKey}
                </span>
                <span className="text-[10px] text-gray-500 truncate leading-tight mt-0.5">
                  {item.emotion.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Legend;