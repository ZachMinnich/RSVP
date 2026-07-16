import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Initialize sample book if library is empty
import { libraryStore } from './store/libraryStore'
import { processBookText } from './utils/textProcessor'
import { generateId } from './utils/generateId'
import { SAMPLE_BOOK } from './utils/sampleBook'
import type { Book, Chapter } from './types'

async function initSampleBook() {
  if (libraryStore.getBooks().length === 0) {
    try {
      const result = await processBookText(SAMPLE_BOOK.text)
      const chapters: Chapter[] = result.chapters.map(ch => ({
        id: generateId(),
        title: ch.title,
        text: ch.text,
        startWordIndex: ch.startWordIndex,
        endWordIndex: ch.endWordIndex,
      }))
      const now = new Date().toISOString()
      const book: Book = {
        id: generateId(),
        title: SAMPLE_BOOK.title,
        author: SAMPLE_BOOK.author,
        description: SAMPLE_BOOK.description,
        coverImage: SAMPLE_BOOK.coverImage,
        sourceNote: SAMPLE_BOOK.sourceNote,
        rawText: SAMPLE_BOOK.text,
        cleanedText: result.cleanedText,
        chapters,
        words: result.words,
        totalWords: result.totalWords,
        estimatedReadingMinutes: result.estimatedReadingMinutes,
        createdAt: now,
        updatedAt: now,
      }
      libraryStore.addBook(book)
    } catch (e) {
      console.error('Failed to init sample book:', e)
    }
  }
}

initSampleBook()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
