import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';

interface CodeEditorProps {
  onCodeChange: (code: string) => void;
  language?: string;
  defaultValue?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  onCodeChange, 
  language = "javascript",
  defaultValue = "// Write your solution here...\n\n"
}) => {
  const [code, setCode] = useState(defaultValue);

  // Debounce logic: Only send code to API after 2 seconds of inactivity
  useEffect(() => {
    const handler = setTimeout(() => {
      onCodeChange(code);
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [code, onCodeChange]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <div className="bg-surfaceHighlight px-4 py-2 flex items-center justify-between border-b border-white/5">
        <span className="text-xs font-semibold tracking-wider text-textMuted uppercase">Interview IDE</span>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
      </div>
      <Editor
        height="calc(100% - 40px)"
        language={language}
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || "")}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          padding: { top: 20 },
          scrollBeyondLastLine: false,
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        }}
      />
    </div>
  );
};
