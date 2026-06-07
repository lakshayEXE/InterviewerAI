import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

export interface TranscriptItem {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp?: number;
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
    <div className="w-80 h-full flex flex-col bg-surface/40 border-l border-white/[0.06] p-4 pt-20">
      <h2 className="text-lg font-serif font-semibold text-textMain mb-4 flex items-center gap-2">
        <Bot size={20} className="text-primary" />
        Live Transcript
      </h2>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {transcript.length === 0 && (
          <p className="text-sm text-textMuted/70 italic mt-4">The conversation will appear here once the interview begins.</p>
        )}
        {transcript.map((item) => (
          <div key={item.id} className={`flex flex-col ${item.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`flex items-center gap-2 mb-1 ${item.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              {item.sender === 'user' ? <User size={15} className="text-sky-400" /> : <Bot size={15} className="text-primary" />}
              <span className="text-[11px] text-textMuted uppercase tracking-wider font-semibold">
                {item.sender === 'user' ? 'You' : 'AI Interviewer'}
              </span>
            </div>
            <div className={`px-4 py-2.5 rounded-2xl max-w-[90%] text-sm leading-relaxed ${
              item.sender === 'user'
                ? 'bg-primary/15 border border-primary/25 text-textMain rounded-tr-sm'
                : 'bg-surface border border-white/[0.06] text-textMain/90 rounded-tl-sm'
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
