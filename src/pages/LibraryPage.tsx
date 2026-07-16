import { useState, useMemo, useEffect } from 'react';
import { BookOpen, Search, Plus, Trash2, RotateCcw, PlayCircle, SortAsc } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import type { Route } from '../App';
import type { SortOption, Book, Chapter } from '../types';
import { processBookText } from '../utils/textProcessor';
import { generateId } from '../utils/generateId';

interface Props {
  navigate: (r: Route) => void;
}

function BookCoverPlaceholder({ title, author }: { title: string; author: string }) {
  const colors = [
    ['#01696f', '#0c4e54'],
    ['#437a22', '#2e5c10'],
    ['#006494', '#0b5177'],
    ['#7a39bb', '#5f2699'],
    ['#a12c7b', '#7d1e5e'],
    ['#da7101', '#c55700'],
  ];
  const idx = (title.charCodeAt(0) + author.charCodeAt(0)) % colors.length;
  const [bg, shadow] = colors[idx];
  const initials = title.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-full h-full flex items-center justify-center rounded-lg text-white font-bold text-2xl select-none"
      style={{
        background: `linear-gradient(135deg, ${bg}, ${shadow})`,
        boxShadow: `inset 0 -4px 12px ${shadow}40`,
      }}
    >
      {initials}
    </div>
  );
}

export default function LibraryPage({ navigate }: Props) {
  const {
    books,
    progress,
    addBook,
    updateBook,
    deleteBook,
    resetProgress,
    getBookById,
  } = useLibraryStore();

  // Sync the daily poem from GitHub into a special book
  useEffect(() => {
    async function syncDailyPoem() {
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/ZachMinnich/RSVP/main/poems/dailypoem.txt',
        );
        if (!res.ok) {
          console.warn('Daily poem not available:', res.status);
          return;
        }

        const text = await res.text();
        if (!text.trim()) return;

        const result = await processBookText(text);
        const chapters: Chapter[] = result.chapters.map(ch => ({
          id: generateId(),
          title: ch.title,
          text: ch.text,
          startWordIndex: ch.startWordIndex,
          endWordIndex: ch.endWordIndex,
        }));

        const now = new Date().toISOString();
        const existing = getBookById('dailypoem');

        const book: Book = {
          id: 'dailypoem',
          title: 'Daily Poem',
          author: 'n8n Daily Feed',
          description: 'Automatically imported each day from GitHub.',
          coverImage: '',
          sourceNote: 'Source: poems/dailypoem.txt (GitHub)',
          rawText: text,
          cleanedText: result.cleanedText,
          chapters,
          words: result.words,
          totalWords: result.totalWords,
          estimatedReadingMinutes: result.estimatedReadingMinutes,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };

        if (existing) {
          updateBook(book);
        } else {
          addBook(book);
        }
      } catch (err) {
        console.error('Failed to sync daily poem', err);
      }
    }

    syncDailyPoem();
  }, [addBook, updateBook, getBookById]);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('recent');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const dailyPoem = books.find(b => b.id === 'dailypoem');
  const otherBooks = books.filter(b => b.id !== 'dailypoem');

  const filtered = useMemo(() => {
    let list = [...otherBooks];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        b =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case 'title':
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'author':
        list.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case 'recent':
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime(),
        );
        break;
      case 'progress':
        list.sort((a, b) => {
          const pa = progress[a.id]?.percentComplete ?? 0;
          const pb = progress[b.id]?.percentComplete ?? 0;
          return pb - pa;
        });
        break;
    }
    return list;
  }, [otherBooks, search, sort, progress]);

  const handleDelete = (id: string) => {
    deleteBook(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)] shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <BookOpen className="text-[var(--color-primary)]" size={26} />
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">
              Rapid Reader Library
            </h1>
            <h1 className="text-xl font-bold tracking-tight sm:hidden">RRL</h1>
          </div>
          <div className="flex-1 relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              size={16}
            />
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search books..."
              className="w-full pl-9 pr-4 py-2 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <SortAsc
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
              />
              <select
                value={sort}
                onChange={e =>
                  setSort(e.target.value as SortOption)
                }
                className="pl-7 pr-3 py-2 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer"
              >
                <option value="recent">Recent</option>
                <option value="title">Title</option>
                <option value="author">Author</option>
                <option value="progress">Progress</option>
              </select>
            </div>
            <button
              onClick={() => navigate({ page: 'add-book' })}
              className="flex items-center gap-1.5 px-3 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Add a Book</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Daily Poem section */}
        {dailyPoem && (
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Daily Poem</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {[dailyPoem].map(book => {
                const prog = progress[book.id];
                const pct = prog?.percentComplete ?? 0;
                return (
                  <div
                    key={book.id}
                    className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                  >
                    <button
                      onClick={() =>
                        navigate({
                          page: 'book-details',
                          bookId: book.id,
                        })
                      }
                      className="block w-full aspect-[2/3] cursor-pointer overflow-hidden"
                    >
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <BookCoverPlaceholder
                          title={book.title}
                          author={book.author}
                        />
                      )}
                    </button>
                    <div className="p-4">
                      <button
                        onClick={() =>
                          navigate({
                            page: 'book-details',
                            bookId: book.id,
                          })
                        }
                        className="text-left w-full"
                      >
                        <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-[var(--color-primary)] transition-colors">
                          {book.title}
                        </h3>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5 mb-2">
                          {book.author}
                        </p>
                      </button>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs text-[var(--color-text-faint)] mb-1">
                          <span>
                            {pct > 0
                              ? `${Math.round(pct)}% read`
                              : 'Not started'}
                          </span>
                          <span>
                            {book.totalWords.toLocaleString()} words
                          </span>
                        </div>
                        <div className="h-1.5 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            navigate({
                              page: 'reader',
                              bookId: book.id,
                              startWordIndex:
                                prog?.currentWordIndex ?? 0,
                            })
                          }
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                        >
                          <PlayCircle size={14} />
                          {pct > 0 ? 'Continue' : 'Read'}
                        </button>
                        <button
                          onClick={() => {
                            resetProgress(book.id);
                          }}
                          title="Restart from beginning"
                          className="p-2 rounded-lg bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-offset-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                        >
                          <RotateCcw size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Existing library section (other books) */}
        {otherBooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BookOpen
              size={56}
              className="text-[var(--color-text-faint)] mb-4"
            />
            <h2 className="text-lg font-semibold mb-2">
              Your library is empty
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-sm mb-6">
              Import your first public-domain book to get started. Paste
              plain text from Project Gutenberg or any text source.
            </p>
            <button
              onClick={() => navigate({ page: 'add-book' })}
              className="flex items-center gap-2 px-5 py-3 bg-[var(--color-primary)] text-white rounded-lg font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              <Plus size={18} />
              Add Your First Book
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Search
              size={40}
              className="text-[var(--color-text-faint)] mb-3"
            />
            <p className="text-[var(--color-text-muted)]">
              No books match your search.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filtered.map(book => {
              const prog = progress[book.id];
              const pct = prog?.percentComplete ?? 0;
              return (
                <div
                  key={book.id}
                  className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <button
                    onClick={() =>
                      navigate({
                        page: 'book-details',
                        bookId: book.id,
                      })
                    }
                    className="block w-full aspect-[2/3] cursor-pointer overflow-hidden"
                  >
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <BookCoverPlaceholder
                        title={book.title}
                        author={book.author}
                      />
                    )}
                  </button>
                  <div className="p-4">
                    <button
                      onClick={() =>
                        navigate({
                          page: 'book-details',
                          bookId: book.id,
                        })
                      }
                      className="text-left w-full"
                    >
                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 hover:text-[var(--color-primary)] transition-colors">
                        {book.title}
                      </h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 mb-2">
                        {book.author}
                      </p>
                    </button>
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-[var(--color-text-faint)] mb-1">
                        <span>
                          {pct > 0
                            ? `${Math.round(pct)}% read`
                            : 'Not started'}
                        </span>
                        <span>
                          {book.totalWords.toLocaleString()} words
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--color-surface-offset)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-primary)] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          navigate({
                            page: 'reader',
                            bookId: book.id,
                            startWordIndex:
                              prog?.currentWordIndex ?? 0,
                          })
                        }
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2 bg-[var(--color-primary)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
                      >
                        <PlayCircle size={14} />
                        {pct > 0 ? 'Continue' : 'Read'}
                      </button>
                      <button
                        onClick={() => {
                          resetProgress(book.id);
                        }}
                        title="Restart from beginning"
                        className="p-2 rounded-lg bg-[var(--color-surface-offset)] hover:bg-[var(--color-surface-offset-2)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(book.id)}
                        title="Delete book"
                        className="p-2 rounded-lg bg-[var(--color-surface-offset)] hover:bg-red-50 dark:hover:bg-red-900/20 text-[var(--color-text-muted)] hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-[var(--color-surface)] rounded-xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-semibold text-base mb-2">Delete Book</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-5">
              Are you sure you want to delete "
              {books.find(b => b.id === deleteConfirm)?.title}"? This
              will also remove your reading progress.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 border border-[var(--color-border)] rounded-lg text-sm hover:bg-[var(--color-surface-offset)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
