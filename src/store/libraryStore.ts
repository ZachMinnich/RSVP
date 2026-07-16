import { useState, useEffect } from 'react';
import type { Book, ReadingProgress, ReaderSettings } from '../types';

const BOOKS_KEY = 'rrl_books';
const PROGRESS_KEY = 'rrl_progress';
const SETTINGS_KEY = 'rrl_settings';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Storage error:', e);
  }
}

export const defaultSettings: ReaderSettings = {
  wpm: 300,
  fontSize: 48,
  darkMode: false,
  focusLetterMode: true,
  phraseMode: 1,
  punctuationPause: true,
  fullscreenPreference: false,
};

// Module-level state for cross-component sharing
let _books: Book[] = loadFromStorage<Book[]>(BOOKS_KEY, []);
let _progress: Record<string, ReadingProgress> = loadFromStorage(PROGRESS_KEY, {});
let _settings: ReaderSettings = { ...defaultSettings, ...loadFromStorage<Partial<ReaderSettings>>(SETTINGS_KEY, {}) };
const _listeners = new Set<() => void>();

function notify() {
  _listeners.forEach(fn => fn());
}

export const libraryStore = {
  getBooks: () => _books,
  getProgress: () => _progress,
  getSettings: () => _settings,

  addBook: (book: Book) => {
    _books = [book, ..._books];
    saveToStorage(BOOKS_KEY, _books);
    notify();
  },

  updateBook: (updated: Book) => {
    _books = _books.map(b => b.id === updated.id ? updated : b);
    saveToStorage(BOOKS_KEY, _books);
    notify();
  },

  deleteBook: (id: string) => {
    _books = _books.filter(b => b.id !== id);
    delete _progress[id];
    saveToStorage(BOOKS_KEY, _books);
    saveToStorage(PROGRESS_KEY, _progress);
    notify();
  },

  getBookById: (id: string): Book | undefined => _books.find(b => b.id === id),

  getProgressForBook: (bookId: string): ReadingProgress | undefined => _progress[bookId],

  saveProgress: (progress: ReadingProgress) => {
    _progress = { ..._progress, [progress.bookId]: progress };
    saveToStorage(PROGRESS_KEY, _progress);
    notify();
  },

  resetProgress: (bookId: string) => {
    delete _progress[bookId];
    saveToStorage(PROGRESS_KEY, _progress);
    notify();
  },

  saveSettings: (settings: ReaderSettings) => {
    _settings = settings;
    saveToStorage(SETTINGS_KEY, _settings);
    notify();
  },

  subscribe: (fn: () => void) => {
    _listeners.add(fn);
    return () => {
      _listeners.delete(fn);
    };
  },
};

export function useLibraryStore() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const unsub = libraryStore.subscribe(() => setVersion(v => v + 1));
    return unsub;
  }, []);

  return {
    books: libraryStore.getBooks(),
    progress: libraryStore.getProgress(),
    settings: libraryStore.getSettings(),
    addBook: libraryStore.addBook,
    updateBook: libraryStore.updateBook,
    deleteBook: libraryStore.deleteBook,
    getBookById: libraryStore.getBookById,
    getProgressForBook: libraryStore.getProgressForBook,
    saveProgress: libraryStore.saveProgress,
    resetProgress: libraryStore.resetProgress,
    saveSettings: libraryStore.saveSettings,
  };
}
