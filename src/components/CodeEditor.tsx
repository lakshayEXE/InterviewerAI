import React, { useState, useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { Code2 } from 'lucide-react';

interface CodeEditorProps {
  onCodeChange: (code: string, language: string) => void;
  onPaste?: (length: number) => void;
  defaultValue?: string;
  // Starter code pushed in by the interviewer (debug/optimize tasks). When this changes to a
  // new value, it replaces the editor contents; candidate edits afterward are preserved.
  injectedCode?: string;
  injectedLanguage?: string;
}

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
];

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  onCodeChange, 
  onPaste,
  defaultValue = "// Write your solution here...\n\n",
  injectedCode,
  injectedLanguage,
}) => {
  const [code, setCode] = useState(defaultValue);
  const [language, setLanguage] = useState('javascript');
  const lastInjectedRef = useRef<string | null>(null);

  const handleMount: OnMount = (editor) => {
    editor.onDidPaste((e) => {
      const pasted = editor.getModel()?.getValueInRange(e.range) ?? '';
      if (pasted) onPaste?.(pasted.length);
    });
  };

  // Load interviewer-provided starter code. Only applies when a genuinely new snippet
  // arrives, so it never clobbers the candidate's in-progress edits on re-render.
  useEffect(() => {
    if (injectedCode != null && injectedCode !== lastInjectedRef.current) {
      lastInjectedRef.current = injectedCode;
      setCode(injectedCode);
      if (injectedLanguage) setLanguage(injectedLanguage);
    }
  }, [injectedCode, injectedLanguage]);

  // Debounce logic: Only send code to API after 2 seconds of inactivity
  useEffect(() => {
    const handler = setTimeout(() => {
      onCodeChange(code, language);
    }, 2000);

    return () => {
      clearTimeout(handler);
    };
  }, [code, language, onCodeChange]);

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex flex-col bg-surfaceHighlight">
      <div className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-background/50">
        <div className="flex items-center gap-3">
          <Code2 size={16} className="text-accent" />
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-sm font-semibold text-white focus:outline-none cursor-pointer appearance-none pr-4 hover:text-accent transition-colors"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id} className="bg-background text-white">
                {lang.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
          <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
        </div>
      </div>
      <div className="flex-1">
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={(value) => setCode(value || "")}
          onMount={handleMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 20 },
            scrollBeyondLastLine: false,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          }}
        />
      </div>
    </div>
  );
};
