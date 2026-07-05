import { useRef, useState, DragEvent } from 'react';
import { extractPdfText, parseCASText } from '../utils/casParser';
import { CASData } from '../types/holding';

interface CASUploadProps {
  onParsed: (data: CASData) => void;
  hasCAS: boolean;
  onClear: () => void;
}

export function CASUpload({ onParsed, hasCAS, onClear }: CASUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'parsing' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.pdf')) {
      setErrorMsg('Please upload a PDF file from CAMS or KFintech.');
      setState('error');
      return;
    }
    setState('parsing');
    setErrorMsg('');
    try {
      const text = await extractPdfText(file);
      const data = parseCASText(text);
      if (data.holdings.length === 0) {
        setErrorMsg('No holdings found. Make sure this is a CAS PDF from CAMS or KFintech.');
        setState('error');
        return;
      }
      onParsed(data);
      setState('idle');
    } catch (e) {
      setErrorMsg('Failed to parse PDF. Try a different CAS file.');
      setState('error');
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (hasCAS) {
    return (
      <button
        onClick={onClear}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30 transition-colors"
        title="Click to remove CAS"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        My Holdings
        <span className="opacity-50">✕</span>
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={state === 'parsing'}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border
          ${dragging
            ? 'bg-accent/30 border-accent text-white scale-105'
            : state === 'error'
              ? 'bg-red-500/20 border-red-500/40 text-red-400'
              : 'bg-surface-hover border-surface-border text-muted hover:text-white hover:border-accent/50'
          }
          ${state === 'parsing' ? 'opacity-60 cursor-wait' : 'cursor-pointer'}
        `}
        title="Upload CAMS / KFintech CAS PDF to see your holdings"
      >
        {state === 'parsing' ? (
          <>
            <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            Parsing…
          </>
        ) : state === 'error' ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {errorMsg.split('.')[0]}
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload CAS
          </>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />
    </div>
  );
}
