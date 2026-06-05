import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

export interface TranscriptItem {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

interface TranscriptSidebarProps {
  transcript: TranscriptItem[];
}

export const TranscriptSidebar: React.FC<TranscriptSidebarProps> = ({ transcript }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  return (
    <div className="w-80 h-full flex flex-col bg-surfaceHighlight border-l border-gray-800 p-4">
      <h2 className="text-xl font-bold text-textMain mb-4 flex items-center gap-2">
        <Bot className="text-accent" />
        Live Transcript
      </h2>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {transcript.map((item) => (
          <div key={item.id} className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 mb-1 ${item.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              {item.sender === 'user' ? <User size={16} className="text-primary" /> : <Bot size={16} className="text-accent" />}
              <span className="text-xs text-textMuted uppercase font-semibold">
                {item.sender === 'user' ? 'You' : 'AI Interviewer'}
              </span>
            </div>
            <div className={`px-4 py-2 rounded-2xl max-w-[90%] text-sm ${
              item.sender === 'user' 
                ? 'bg-primaryDim text-green-50 rounded-tr-none' 
                : 'bg-surface border border-gray-700 text-gray-200 rounded-tl-none'
            }`}>
              {item.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
