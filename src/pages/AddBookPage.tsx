import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, BookOpen, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useLibraryStore } from '../store/libraryStore';
import { processBookText } from '../utils/textProcessor';
import { generateId } from '../utils/generateId';
import type { Book, Chapter } from '../types';
import type { Route } from '../App';

interface Props {
  navigate: (r: Route) => void;
  editBookId?: string;
}

interface Preview {
  title: string;
  author: string;
  chapterCount: number;
  totalWords: number;
  estimatedMinutes: number;
  firstWords: string;
  warning?: string;
}

export default function AddBookPage({ navigate, editBookId }: Props) {
  const { addBook, updateBook, getBookById } = useLibraryStore();
  const editBook = editBookId ? getBookById(editBookId) : undefined;

  const [title, setTitle] = useState(editBook?.title ?? '');
  const [author, setAuthor] = useState(editBook?.author ?? '');
  const [coverImage, setCoverImage] = useState(editBook?.coverImage ?? '');
  const [description, setDescription] = useState(editBook?.description ?? '');
  const [sourceNote, setSourceNote] = useState(editBook?.sourceNote ?? '');
  const [bookText, setBookText] = useState(editBook?.rawText ?? '');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.txt')) {
      setErrors(prev => ({ ...prev, file: 'Only .txt files are supported.' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = evt => {
      setBookText(evt.target?.result as string ?? '');
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const generatePreview = useCallback(async () => {
    if (!bookText.trim()) {
      setErrors(prev => ({ ...prev, text: 'Please paste or upload book text.' }));
      return;
    }
    setProcessing(true);
    setPreview(null);
    setErrors({});
    try {
      const result = await processBookText(bookText);
      const firstWords = result.words.slice(0, 60).join(' ');
      const warning = result.totalWords < 100 ? 'The text appears very short. Are you sure this is the full book?' : undefined;
      setPreview({
        title: title || 'Untitled',
        author: author || 'Unknown',
        chapterCount: result.chapters.length,
        totalWords: result.totalWords,
        estimatedMinutes: result.estimatedReadingMinutes,
        firstWords,
        warning,
      });
    } catch (err) {
      setErrors(prev => ({ ...prev, text: 'Failed to process text. Please try again.' }));
    } finally {
      setProcessing(false);
    }
  }, [bookText, title, author]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required.';
    if (!author.trim()) errs.author = 'Author is required.';
    if (!bookText.trim()) errs.text = 'Book text is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const result = await processBookText(bookText);
      const chapters: Chapter[] = result.chapters.map(ch => ({
        id: generateId(),
        title: ch.title,
        text: ch.text,
        startWordIndex: ch.startWordIndex,
        endWordIndex: ch.endWordIndex,
      }));

      const now = new Date().toISOString();

      if (editBook && editBookId) {
        const updated: Book = {
          ...editBook,
          title: title.trim(),
          author: author.trim(),
          coverImage: coverImage.trim(),
          description: description.trim(),
          sourceNote: sourceNote.trim(),
          rawText: bookText,
          cleanedText: result.cleanedText,
          chapters,
          words: result.words,
          totalWords: result.totalWords,
          estimatedReadingMinutes: result.estimatedReadingMinutes,
          updatedAt: now,
        };
        updateBook(updated);
        navigate({ page: 'book-details', bookId: editBookId });
      } else {
        const book: Book = {
          id: generateId(),
          title: title.trim(),
          author: author.trim(),
          coverImage: coverImage.trim(),
          description: description.trim(),
          sourceNote: sourceNote.trim(),
          rawText: bookText,
          cleanedText: result.cleanedText,
          chapters,
          words: result.words,
          totalWords: result.totalWords,
          estimatedReadingMinutes: result.estimatedReadingMinutes,
          createdAt: now,
          updatedAt: now,
        };
        addBook(book);
        navigate({ page: 'book-details', bookId: book.id });
      }
    } catch (err) {
      setErrors({ submit: 'Failed to save book. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-30 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <button onClick={() => navigate({ page: 'library' })} className="p-2 rounded-lg hover:bg-[var(--color-surface-offset)] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-semibold">{editBook ? 'Edit Book' : 'Add a Book'}</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Copyright notice */}
        <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p>Only upload or paste books that are in the public domain, written by you, licensed for distribution, or legally available for your use.</p>
        </div>

        {/* Book metadata */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><BookOpen size={18} className="text-[var(--color-primary)]" /> Book Details</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Pride and Prejudice"
                className={`w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.title ? 'border-red-500' : 'border-[var(--color-border)]'}`} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Author <span className="text-red-500">*</span></label>
              <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="e.g. Jane Austen"
                className={`w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${errors.author ? 'border-red-500' : 'border-[var(--color-border)]'}`} />
              {errors.author && <p className="text-xs text-red-500 mt-1">{errors.author}</p>}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Cover Image URL <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
            <input type="url" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..."
              className="w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="A brief summary or description..."
              className="w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Source / Copyright Note <span className="text-[var(--color-text-muted)] font-normal">(optional)</span></label>
            <input type="text" value={sourceNote} onChange={e => setSourceNote(e.target.value)} placeholder="e.g. Source: Project Gutenberg, public domain"
              className="w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </section>

        {/* Text input */}
        <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2"><FileText size={18} className="text-[var(--color-primary)]" /> Book Text</h2>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Upload a .txt file</label>
            <div
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 p-3 border-2 border-dashed border-[var(--color-border)] rounded-lg cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-highlight)]/30 transition-colors"
            >
              <Upload size={20} className="text-[var(--color-text-muted)]" />
              <span className="text-sm text-[var(--color-text-muted)]">Click to upload a plain text (.txt) file</span>
              <input ref={fileRef} type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            </div>
            {errors.file && <p className="text-xs text-red-500 mt-1">{errors.file}</p>}
          </div>

          <div className="text-xs text-[var(--color-text-muted)] text-center">— or —</div>

          {/* Paste text */}
          <div>
            <label className="block text-sm font-medium mb-1">Paste the full book text here</label>
            <textarea
              value={bookText}
              onChange={e => { setBookText(e.target.value); setPreview(null); }}
              rows={14}
              placeholder="Paste your entire book text here..."
              className={`w-full px-3 py-2.5 bg-[var(--color-surface-offset)] border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-y ${errors.text ? 'border-red-500' : 'border-[var(--color-border)]'}`}
            />
            {bookText && <p className="text-xs text-[var(--color-text-muted)] mt-1">{bookText.length.toLocaleString()} characters pasted</p>}
            {errors.text && <p className="text-xs text-red-500 mt-1">{errors.text}</p>}
          </div>

          {/* Preview button */}
          <button
            onClick={generatePreview}
            disabled={processing || !bookText.trim()}
            className="w-full py-2.5 border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg text-sm font-medium hover:bg-[var(--color-primary-highlight)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {processing ? <><Loader2 size={16} className="animate-spin" /> Processing...</> : 'Preview Import'}
          </button>
        </section>

        {/* Preview panel */}
        {preview && (
          <section className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 space-y-3">
            <h2 className="font-semibold flex items-center gap-2 text-[var(--color-success)]">
              <CheckCircle size={18} /> Import Preview
            </h2>
            {preview.warning && (
              <div className="flex gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <p>{preview.warning}</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Chapters', value: preview.chapterCount },
                { label: 'Total Words', value: preview.totalWords.toLocaleString() },
                { label: 'Est. Reading Time', value: `${preview.estimatedMinutes} min` },
              ].map(stat => (
                <div key={stat.label} className="bg-[var(--color-surface-offset)] rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-[var(--color-primary)]">{stat.value}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{stat.label}</div>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">First 60 words:</p>
              <p className="text-sm leading-relaxed text-[var(--color-text-muted)] italic border-l-2 border-[var(--color-primary)] pl-3">{preview.firstWords}{preview.totalWords > 60 ? '...' : ''}</p>
            </div>
          </section>
        )}

        {errors.submit && (
          <div className="flex gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            {errors.submit}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full py-3.5 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base"
        >
          {saving ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : (editBook ? 'Save Changes' : 'Create Book')}
        </button>
      </main>
    </div>
  );
}
