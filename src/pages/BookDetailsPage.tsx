import { useState } from 'react';
import { ArrowLeft, Trash2, Edit2, PlayCircle, List, Clock, Type, BookMarked } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import type { Route } from '../App';

interface Props {
  navigate: (r: Route) => void;
  bookId: string;
}

export default function BookDetailsPage({ navigate, bookId }: Props) {
  const { getBookById, getProgressForBook, resetProgress, deleteBook } = useLibraryStore();
  const book = getBookById(bookId);
  const progress = getProgressForBook(bookId);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  if (!book) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[var(--color-text-muted)] mb-4">Book not found.</p>
          <button onClick={() => navigate({ page: 'library' })} className="text-[var(--color-primary)]">← Back to library</button>
        </div>
      </div>
    );
  }

  const pct = progress?.percentComplete ?? 0;
  const currentWordIndex = progress?.currentWordIndex ?? 0;
  const currentChapterIndex = progress?.currentChapterIndex ?? 0;

  const handleDelete = () => {
    deleteBook(bookId);
    navigate({ page: 'library' });
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate({ page: 'library' })} className="p-2 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold truncate flex-1">{book.title}</h1>
          <div className="flex gap-2">
            <button onClick={() => navigate({ page: 'edit-book', bookId })} className="p-2 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors" title="Edit book">
              <Edit2 size={18} />
            </button>
            <button onClick={() => setDeleteConfirm(true)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-600 transition-colors" title="Delete book">
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cover + meta */}
          <div className="md:col-span-1 space-y-4">
            <div className="aspect-[2/3] rounded-xl overflow-hidden bg-[var(--color-surface-offset)]">
              {book.coverImage ? (
                <img src={book.coverImage} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-active)] text-white text-4xl font-bold">
                  {book.title.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]"><Type size={14} />{book.totalWords.toLocaleString()} words</div>
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]"><Clock size={14} />~{book.estimatedReadingMinutes} min to read</div>
              <div className="flex items-center gap-2 text-[var(--color-text-muted)]"><List size={14} />{book.chapters.length} chapter{book.chapters.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {/* Details */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <h2 className="text-2xl font-bold leading-tight">{book.title}</h2>
              <p className="text-[var(--color-text-muted)] mt-1">{book.author}</p>
            </div>

            {book.description && <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{book.description}</p>}

            {/* Progress */}
            <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Reading Progress</span>
                <span className="text-[var(--color-primary)] font-semibold">{Math.round(pct)}%</span>
              </div>
              <div className="h-2 bg-[var(--color-surface-offset)] rounded-full overflow-hidden mb-3">
                <div className="h-full bg-[var(--color-primary)] rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">
                {pct > 0
                  ? `At word ${currentWordIndex.toLocaleString()} of ${book.totalWords.toLocaleString()} · Chapter ${currentChapterIndex + 1}`
                  : 'Not started yet'}
              </p>
            </div>

            {/* Read buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate({ page: 'reader', bookId, startWordIndex: pct > 0 ? currentWordIndex : 0 })}
                className="flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                <PlayCircle size={18} />
                {pct > 0 ? 'Continue Reading' : 'Start Reading'}
              </button>
              {pct > 0 && (
                <button
                  onClick={() => { resetProgress(bookId); }}
                  className="flex items-center gap-2 px-4 py-3 border border-[var(--color-border)] rounded-xl text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
                >
                  Restart from Beginning
                </button>
              )}
            </div>

            {/* Chapter list */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BookMarked size={16} className="text-[var(--color-primary)]" /> Chapters</h3>
              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                {book.chapters.map((ch, i) => {
                  const isCurrentChapter = i === currentChapterIndex && pct > 0;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => navigate({ page: 'reader', bookId, startWordIndex: ch.startWordIndex })}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-[var(--color-surface-offset)] transition-colors ${isCurrentChapter ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]' : ''}`}
                    >
                      <span className="text-xs text-[var(--color-text-faint)] w-6 text-right flex-shrink-0">{i + 1}</span>
                      <span className="truncate">{ch.title}</span>
                      {isCurrentChapter && <span className="ml-auto text-xs font-medium text-[var(--color-primary)]">Current</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {book.sourceNote && (
              <p className="text-xs text-[var(--color-text-faint)] border-t border-[var(--color-border)] pt-3">{book.sourceNote}</p>
            )}
          </div>
        </div>
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--color-surface)] rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-base mb-2">Delete Book</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">Delete "{book.title}"? Your reading progress will also be removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-offset)] transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
