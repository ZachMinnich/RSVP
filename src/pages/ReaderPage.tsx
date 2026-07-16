import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight,
  RotateCcw, Maximize2, Minimize2, X, Settings2, Moon, Sun,
  Minus, Plus, BookOpen
} from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { getPauseMult, getORPIndex } from '../utils/textProcessor';
import type { Route } from '../App';

interface Props {
  navigate: (r: Route) => void;
  bookId: string;
  startWordIndex?: number;
}

const MIN_WPM = 100, MAX_WPM = 1000, WPM_STEP = 25;

// Save progress every N words
const SAVE_EVERY = 10;

export default function ReaderPage({ navigate, bookId, startWordIndex = 0 }: Props) {
  const { getBookById, getProgressForBook, saveProgress, settings, saveSettings } = useLibraryStore();
  const book = getBookById(bookId);
  const savedProgress = getProgressForBook(bookId);

  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [wordIndex, setWordIndex] = useState(() => startWordIndex ?? (savedProgress?.currentWordIndex ?? 0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaveRef = useRef<number>(wordIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const words = book?.words ?? [];
  const totalWords = words.length;

  // Find which chapter the current word belongs to
  const currentChapter = useMemo(() => {
    if (!book) return null;
    return book.chapters.find(ch => wordIndex >= ch.startWordIndex && wordIndex <= ch.endWordIndex) ?? book.chapters[0] ?? null;
  }, [book, wordIndex]);

  const currentChapterIndex = useMemo(() => {
    if (!book || !currentChapter) return 0;
    return book.chapters.indexOf(currentChapter);
  }, [book, currentChapter]);

  const percentComplete = totalWords > 0 ? Math.round((wordIndex / totalWords) * 100) : 0;

  const saveCurrentProgress = useCallback((idx: number) => {
    if (!book) return;
    const pct = totalWords > 0 ? (idx / totalWords) * 100 : 0;
    const chIdx = book.chapters.findIndex(ch => idx >= ch.startWordIndex && idx <= ch.endWordIndex);
    saveProgress({
      bookId,
      currentWordIndex: idx,
      currentChapterIndex: Math.max(0, chIdx),
      percentComplete: pct,
      lastReadAt: new Date().toISOString(),
    });
    lastSaveRef.current = idx;
  }, [book, bookId, totalWords, saveProgress]);

  // Auto-save on unmount or pause
  useEffect(() => {
    return () => {
      saveCurrentProgress(wordIndex);
    };
  }, []);

  // Advance words
  const advance = useCallback(() => {
    setWordIndex(prev => {
      const next = prev + localSettings.phraseMode;
      if (next >= totalWords) {
        setIsPlaying(false);
        return totalWords - 1;
      }
      // Periodic save
      if (Math.abs(next - lastSaveRef.current) >= SAVE_EVERY) {
        // save asynchronously
        setTimeout(() => saveCurrentProgress(next), 0);
      }
      return next;
    });
  }, [localSettings.phraseMode, totalWords, saveCurrentProgress]);

  // Playback loop
  useEffect(() => {
    if (intervalRef.current) clearTimeout(intervalRef.current);
    if (!isPlaying) return;

    const word = words[wordIndex] ?? '';
    const baseDelay = (60 / localSettings.wpm) * 1000;
    const mult = localSettings.punctuationPause ? getPauseMult(word) : 1.0;

    // For phrase mode, slightly reduce delay per extra word
    const phraseMultiplier = localSettings.phraseMode > 1 ? localSettings.phraseMode * 0.85 : 1;
    const delay = baseDelay * mult * phraseMultiplier;

    intervalRef.current = setTimeout(advance, delay);
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [isPlaying, wordIndex, localSettings.wpm, localSettings.punctuationPause, localSettings.phraseMode, advance, words]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.code) {
        case 'Space': e.preventDefault(); setIsPlaying(p => !p); break;
        case 'ArrowLeft': e.preventDefault(); if (e.shiftKey) setWordIndex(p => Math.max(0, p - 10)); else setWordIndex(p => Math.max(0, p - 1)); break;
        case 'ArrowRight': e.preventDefault(); if (e.shiftKey) setWordIndex(p => Math.min(totalWords - 1, p + 10)); else setWordIndex(p => Math.min(totalWords - 1, p + 1)); break;
        case 'ArrowUp': e.preventDefault(); setLocalSettings(s => ({ ...s, wpm: Math.min(MAX_WPM, s.wpm + WPM_STEP) })); break;
        case 'ArrowDown': e.preventDefault(); setLocalSettings(s => ({ ...s, wpm: Math.max(MIN_WPM, s.wpm - WPM_STEP) })); break;
        case 'Escape': setIsFullscreen(false); setShowSettings(false); break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [totalWords]);

  // Fullscreen
  useEffect(() => {
    const onFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement && containerRef.current) {
      try { await containerRef.current.requestFullscreen(); } catch { setIsFullscreen(f => !f); }
    } else {
      try { await document.exitFullscreen(); } catch { setIsFullscreen(false); }
    }
  };

  const toggleDarkMode = () => {
    const newSettings = { ...localSettings, darkMode: !localSettings.darkMode };
    setLocalSettings(newSettings);
    saveSettings(newSettings);
    document.documentElement.setAttribute('data-theme', newSettings.darkMode ? 'dark' : 'light');
  };

  const handleWpmChange = (val: number) => {
    const newSettings = { ...localSettings, wpm: Math.min(MAX_WPM, Math.max(MIN_WPM, val)) };
    setLocalSettings(newSettings);
    saveSettings(newSettings);
  };

  const goToPrevChapter = () => {
    if (!book) return;
    setIsPlaying(false);
    const prevCh = book.chapters[currentChapterIndex - 1];
    if (prevCh) setWordIndex(prevCh.startWordIndex);
  };

  const goToNextChapter = () => {
    if (!book) return;
    setIsPlaying(false);
    const nextCh = book.chapters[currentChapterIndex + 1];
    if (nextCh) setWordIndex(nextCh.startWordIndex);
  };

  const goToPrevSentence = () => {
    setIsPlaying(false);
    let idx = wordIndex - 1;
    while (idx > 0 && !/[.!?]/.test(words[idx - 1] ?? '')) idx--;
    setWordIndex(Math.max(0, idx));
  };

  const goToNextSentence = () => {
    setIsPlaying(false);
    let idx = wordIndex + 1;
    while (idx < totalWords - 1 && !/[.!?]/.test(words[idx - 1] ?? '')) idx++;
    setWordIndex(Math.min(totalWords - 1, idx));
  };

  const exitReader = () => {
    saveCurrentProgress(wordIndex);
    if (document.fullscreenElement) document.exitFullscreen();
    navigate({ page: 'book-details', bookId });
  };

  // Build display phrase
  const displayWords = useMemo(() => {
    const count = localSettings.phraseMode;
    return words.slice(wordIndex, wordIndex + count);
  }, [words, wordIndex, localSettings.phraseMode]);

  // Estimated time remaining
  const wordsRemaining = totalWords - wordIndex;
  const minutesRemaining = localSettings.wpm > 0 ? Math.ceil(wordsRemaining / localSettings.wpm) : 0;

  if (!book) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <p className="text-[var(--color-text-muted)]">Book not found. <button onClick={() => navigate({ page: 'library' })} className="text-[var(--color-primary)]">Go back</button></p>
      </div>
    );
  }

  const isDark = localSettings.darkMode;

  return (
    <div
      ref={containerRef}
      className={`reader-container flex flex-col h-screen overflow-hidden select-none ${isDark ? 'bg-gray-950 text-gray-100' : 'bg-[var(--color-bg)] text-[var(--color-text)]'}`}
      style={{ fontFamily: 'var(--font-body, system-ui, sans-serif)' }}
    >
      {/* Top bar */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${isDark ? 'border-gray-800 bg-gray-900' : 'border-[var(--color-border)] bg-[var(--color-surface)]'} flex-shrink-0`}>
        <button onClick={exitReader} className={`flex items-center gap-1.5 text-sm px-2 py-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}>
          <X size={16} /> Exit
        </button>
        <div className="text-sm font-medium truncate max-w-xs text-center">
          {book.title}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={toggleDarkMode} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}>
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button onClick={() => setShowSettings(s => !s)} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}>
            <Settings2 size={16} />
          </button>
          <button onClick={toggleFullscreen} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}>
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Chapter info */}
      <div className={`text-center py-1.5 text-xs px-4 ${isDark ? 'text-gray-500' : 'text-[var(--color-text-muted)]'} flex-shrink-0`}>
        {currentChapter?.title ?? ''} {book.chapters.length > 1 && `(${currentChapterIndex + 1}/${book.chapters.length})`}
      </div>

      {/* Main word display area */}
      <div className="flex-1 flex items-center justify-center px-4 relative">
        <RSVPDisplay
          words={displayWords}
          fontSize={localSettings.fontSize}
          focusLetter={localSettings.focusLetterMode}
          isDark={isDark}
        />
      </div>

      {/* Progress */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className={`text-xs w-10 text-right ${isDark ? 'text-gray-500' : 'text-[var(--color-text-faint)]'}`}>{percentComplete}%</span>
          <input
            type="range"
            min={0}
            max={totalWords - 1}
            value={wordIndex}
            onChange={e => { setIsPlaying(false); setWordIndex(Number(e.target.value)); }}
            className="flex-1 h-2 accent-[var(--color-primary)] cursor-pointer"
          />
          <span className={`text-xs w-16 ${isDark ? 'text-gray-500' : 'text-[var(--color-text-faint)]'}`}>{wordIndex.toLocaleString()}/{totalWords.toLocaleString()}</span>
        </div>
        <div className={`text-center text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-[var(--color-text-faint)]'}`}>
          ~{minutesRemaining} min remaining
        </div>
      </div>

      {/* Controls */}
      <div className={`sticky bottom-0 border-t px-3 sm:px-6 py-3 flex-shrink-0 ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-[var(--color-surface)] border-[var(--color-border)]'}`}>
        {/* WPM row */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button onClick={() => handleWpmChange(localSettings.wpm - WPM_STEP)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}><Minus size={14} /></button>
          <div className="text-center">
            <div className={`text-lg font-bold tabular-nums ${isDark ? 'text-gray-100' : 'text-[var(--color-text)]'}`}>{localSettings.wpm}</div>
            <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-[var(--color-text-faint)]'}`}>WPM</div>
          </div>
          <button onClick={() => handleWpmChange(localSettings.wpm + WPM_STEP)} className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)]'}`}><Plus size={14} /></button>
          <input
            type="range"
            min={MIN_WPM}
            max={MAX_WPM}
            step={WPM_STEP}
            value={localSettings.wpm}
            onChange={e => handleWpmChange(Number(e.target.value))}
            className="w-28 sm:w-40 accent-[var(--color-primary)]"
          />
        </div>

        {/* Navigation row */}
        <div className="flex items-center justify-center gap-1 sm:gap-2">
          {/* Prev chapter */}
          <ControlBtn onClick={goToPrevChapter} isDark={isDark} title="Previous chapter" disabled={currentChapterIndex <= 0}>
            <BookOpen size={15} className="rotate-0" /><ChevronLeft size={14} className="-ml-1" />
          </ControlBtn>
          {/* Prev sentence */}
          <ControlBtn onClick={goToPrevSentence} isDark={isDark} title="Previous sentence">
            <ChevronLeft size={14} /><ChevronLeft size={14} className="-ml-2" />
          </ControlBtn>
          {/* Back 10 */}
          <ControlBtn onClick={() => { setIsPlaying(false); setWordIndex(p => Math.max(0, p - 10)); }} isDark={isDark} title="Back 10 words (Shift+←)">
            <SkipBack size={16} />
            <span className="text-xs">10</span>
          </ControlBtn>
          {/* Prev word */}
          <ControlBtn onClick={() => { setIsPlaying(false); setWordIndex(p => Math.max(0, p - 1)); }} isDark={isDark} title="Previous word (←)">
            <ChevronLeft size={18} />
          </ControlBtn>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(p => !p)}
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-all shadow-md mx-2 ${isPlaying ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white'}`}
          >
            {isPlaying ? <Pause size={22} /> : <Play size={22} className="ml-0.5" />}
          </button>

          {/* Next word */}
          <ControlBtn onClick={() => { setIsPlaying(false); setWordIndex(p => Math.min(totalWords - 1, p + 1)); }} isDark={isDark} title="Next word (→)">
            <ChevronRight size={18} />
          </ControlBtn>
          {/* Forward 10 */}
          <ControlBtn onClick={() => { setIsPlaying(false); setWordIndex(p => Math.min(totalWords - 1, p + 10)); }} isDark={isDark} title="Forward 10 words (Shift+→)">
            <span className="text-xs">10</span>
            <SkipForward size={16} />
          </ControlBtn>
          {/* Next sentence */}
          <ControlBtn onClick={goToNextSentence} isDark={isDark} title="Next sentence">
            <ChevronRight size={14} /><ChevronRight size={14} className="-ml-2" />
          </ControlBtn>
          {/* Next chapter */}
          <ControlBtn onClick={goToNextChapter} isDark={isDark} title="Next chapter" disabled={!book.chapters[currentChapterIndex + 1]}>
            <ChevronRight size={14} className="-mr-1" /><BookOpen size={15} />
          </ControlBtn>
        </div>

        {/* Restart chapter */}
        <div className="flex justify-center mt-2">
          <button
            onClick={() => { setIsPlaying(false); if (currentChapter) setWordIndex(currentChapter.startWordIndex); }}
            className={`text-xs flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors ${isDark ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-[var(--color-text-faint)] hover:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)]'}`}
          >
            <RotateCcw size={12} /> Restart chapter
          </button>
        </div>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <SettingsPanel
          settings={localSettings}
          onClose={() => setShowSettings(false)}
          onChange={s => { setLocalSettings(s); saveSettings(s); }}
          isDark={isDark}
        />
      )}
    </div>
  );
}

// RSVP Word Display — ORP letter is pinned to screen center via absolute positioning.
// before-text is right-aligned ending at center; after-text is left-aligned starting
// at center. This keeps the orange letter column perfectly stable as words change.
function RSVPDisplay({ words, fontSize, focusLetter, isDark }: {
  words: string[];
  fontSize: number;
  focusLetter: boolean;
  isDark: boolean;
}) {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minWidth: '90vw', maxWidth: '90vw', minHeight: `${fontSize * 2.5}px` }}
    >
      <div className="flex items-center justify-center gap-6" style={{ lineHeight: 1 }}>
        {words.map((word, wi) => (
          <Word
            key={wi}
            word={word}
            fontSize={fontSize}
            focusLetter={focusLetter && words.length === 1}
            isDark={isDark}
          />
        ))}
      </div>
    </div>
  );
}

function Word({ word, fontSize, focusLetter, isDark }: {
  word: string;
  fontSize: number;
  focusLetter: boolean;
  isDark: boolean;
}) {
  if (!word) return null;
  const orpIdx = getORPIndex(word);
  const textColor = isDark ? '#f1f5f9' : '#1a1714';
  const mutedColor = isDark ? '#94a3b8' : '#6b7280';
  const accentColor = '#e05e00';
  // Approximate character width in px for the chosen font-size
  const charW = fontSize * 0.58;

  if (!focusLetter) {
    return (
      <span style={{ fontSize, fontWeight: 700, letterSpacing: '-0.01em', color: textColor }}>
        {word}
      </span>
    );
  }

  const before = word.slice(0, orpIdx);
  const orp = word.slice(orpIdx, orpIdx + 1);
  const after = word.slice(orpIdx + 1);

  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        fontSize,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        // Wide enough for any word; the ORP char is always at the midpoint
        width: `${word.length * charW + charW * 2}px`,
        height: `${fontSize * 1.25}px`,
      }}
    >
      {/* "before" letters: right-aligned, ending one half-char left of center */}
      <span style={{
        position: 'absolute',
        right: `calc(50% + ${charW * 0.45}px)`,
        top: 0,
        color: mutedColor,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}>
        {before}
      </span>

      {/* ORP letter: fixed at horizontal center */}
      <span style={{
        position: 'absolute',
        left: '50%',
        top: 0,
        transform: 'translateX(-50%)',
        color: accentColor,
        fontWeight: 900,
        lineHeight: 1,
      }}>
        {orp}
      </span>

      {/* "after" letters: left-aligned, starting one half-char right of center */}
      <span style={{
        position: 'absolute',
        left: `calc(50% + ${charW * 0.45}px)`,
        top: 0,
        color: mutedColor,
        whiteSpace: 'nowrap',
        lineHeight: 1,
      }}>
        {after}
      </span>
    </span>
  );
}

function ControlBtn({ children, onClick, isDark, title, disabled }: {
  children: React.ReactNode;
  onClick: () => void;
  isDark: boolean;
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center justify-center gap-0.5 w-10 h-10 sm:w-12 sm:h-12 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-[var(--color-surface-offset)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}`}
    >
      {children}
    </button>
  );
}

function SettingsPanel({ settings, onClose, onChange, isDark }: {
  settings: import("../types").ReaderSettings;
  onClose: () => void;
  onChange: (s: import("../types").ReaderSettings) => void;
  isDark: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div
        className={`w-full max-w-sm rounded-2xl p-6 space-y-5 shadow-xl ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-[var(--color-surface)] text-[var(--color-text)]'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Reader Settings</h3>
          <button onClick={onClose} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-800' : 'hover:bg-[var(--color-surface-offset)]'}`}><X size={16} /></button>
        </div>

        {/* Font size */}
        <Setting label={`Font Size: ${settings.fontSize}px`} isDark={isDark}>
          <input type="range" min={24} max={96} step={4} value={settings.fontSize}
            onChange={e => onChange({ ...settings, fontSize: Number(e.target.value) })}
            className="w-full accent-[var(--color-primary)]" />
        </Setting>

        {/* Phrase mode */}
        <Setting label="Words per Flash" isDark={isDark}>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(n => (
              <button key={n} onClick={() => onChange({ ...settings, phraseMode: n })}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${settings.phraseMode === n ? 'bg-[var(--color-primary)] text-white' : isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-offset-2)]'}`}>
                {n}
              </button>
            ))}
          </div>
        </Setting>

        {/* Toggles */}
        <Setting label="Focus Letter (ORP)" isDark={isDark}>
          <Toggle on={settings.focusLetterMode} onToggle={() => onChange({ ...settings, focusLetterMode: !settings.focusLetterMode })} isDark={isDark} />
        </Setting>

        <Setting label="Punctuation Pause" isDark={isDark}>
          <Toggle on={settings.punctuationPause} onToggle={() => onChange({ ...settings, punctuationPause: !settings.punctuationPause })} isDark={isDark} />
        </Setting>

        <div className={`text-xs pt-2 border-t ${isDark ? 'text-gray-600 border-gray-800' : 'text-[var(--color-text-faint)] border-[var(--color-border)]'}`}>
          Keyboard: Space=play/pause · ←/→=word · Shift+←/→=±10 · ↑/↓=speed · Esc=exit fullscreen
        </div>
      </div>
    </div>
  );
}

function Setting({ label, children, isDark }: { label: string; children: React.ReactNode; isDark: boolean }) {
  return (
    <div>
      <div className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-[var(--color-text)]'}`}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle, isDark }: { on: boolean; onToggle: () => void; isDark: boolean }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-[var(--color-primary)]' : isDark ? 'bg-gray-700' : 'bg-[var(--color-surface-dynamic)]'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );
}
