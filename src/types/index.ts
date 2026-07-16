export interface Chapter {
  id: string;
  title: string;
  text: string;
  startWordIndex: number;
  endWordIndex: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string;
  coverImage: string;
  sourceNote: string;
  rawText: string;
  cleanedText: string;
  chapters: Chapter[];
  words: string[];
  totalWords: number;
  estimatedReadingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingProgress {
  bookId: string;
  currentWordIndex: number;
  currentChapterIndex: number;
  percentComplete: number;
  lastReadAt: string;
}

export interface ReaderSettings {
  wpm: number;
  fontSize: number;
  darkMode: boolean;
  focusLetterMode: boolean;
  phraseMode: number; // 1, 2, 3, or 4 words
  punctuationPause: boolean;
  fullscreenPreference: boolean;
}

export type SortOption = 'title' | 'author' | 'recent' | 'progress';
