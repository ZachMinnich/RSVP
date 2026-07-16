import { useState, useEffect } from 'react';
import LibraryPage from './pages/LibraryPage';
import AddBookPage from './pages/AddBookPage';
import BookDetailsPage from './pages/BookDetailsPage';
import ReaderPage from './pages/ReaderPage';
import { useLibraryStore } from './store/libraryStore';

export type Route =
  | { page: 'library' }
  | { page: 'add-book' }
  | { page: 'edit-book'; bookId: string }
  | { page: 'book-details'; bookId: string }
  | { page: 'reader'; bookId: string; startWordIndex?: number };

export default function App() {
  const [route, setRoute] = useState<Route>({ page: 'library' });
  const { settings } = useLibraryStore();

  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [settings.darkMode]);

  const navigate = (r: Route) => setRoute(r);

  if (route.page === 'library') {
    return <LibraryPage navigate={navigate} />;
  }
  if (route.page === 'add-book' || route.page === 'edit-book') {
    return <AddBookPage navigate={navigate} editBookId={route.page === 'edit-book' ? route.bookId : undefined} />;
  }
  if (route.page === 'book-details') {
    return <BookDetailsPage navigate={navigate} bookId={route.bookId} />;
  }
  if (route.page === 'reader') {
    return <ReaderPage navigate={navigate} bookId={route.bookId} startWordIndex={route.startWordIndex} />;
  }
  return <LibraryPage navigate={navigate} />;
}
