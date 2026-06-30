import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Cpu, Target, Brain, Microscope } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, icon: Icon, isOpen, onToggle, children }) => (
  <div className="terminal-box mb-4 overflow-hidden">
    <button 
      onClick={onToggle}
      className="w-full flex items-center justify-between p-4 bg-black/40 hover:bg-black/60 transition-colors border-b border-neonViolet/20"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-hackerGreen" />
        <h2 className="text-[10px] uppercase tracking-[0.3em] font-bold text-hackerGreen">{title}</h2>
      </div>
      {isOpen ? <ChevronUp className="w-4 h-4 text-neonViolet" /> : <ChevronDown className="w-4 h-4 text-neonViolet" />}
    </button>
    {isOpen && <div className="p-6 bg-black/20">{children}</div>}
  </div>
);

export default CollapsibleSection;
