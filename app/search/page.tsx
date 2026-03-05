'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PhotoGrid from '@/components/PhotoGrid';
import '../search.css';

export interface Photo {
  id: string;
  content: string;
  imageUrl: string;
  username: string;
  likes: string[];
  comments: number;
  createdAt: string;
}

export default function SearchPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id || '');
    setIsAuthenticated(true);
  }, [router]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/posts?search=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      const mapped: Photo[] = (data.posts || []).map((p: any) => ({
        id: p._id,
        content: p.content,
        imageUrl: p.imageUrl || '',
        username: p.username,
        likes: p.likes || [],
        comments: (p.comments || []).length,
        createdAt: p.createdAt,
      }));
      setResults(mapped);
    } catch (err) {
      console.error('Search failed:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="search-container">
      <Navbar />

      <main className="search-main">
        <div className="search-header">
          <div className="search-input-wrapper">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search photos, users, captions..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              autoFocus
            />
          </div>
        </div>

        <div className="search-results">
          {isLoading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Searching...</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length === 0 && (
            <div className="empty-state">
              <p className="empty-message">No photos found for "{searchQuery}"</p>
            </div>
          )}

          {!isLoading && hasSearched && results.length > 0 && (
            <>
              <p className="results-count">Found {results.length} photo{results.length !== 1 ? 's' : ''}</p>
              <PhotoGrid photos={results} currentUserId={currentUserId} />
            </>
          )}

          {!hasSearched && (
            <div className="empty-state">
              <p className="empty-icon">🔍</p>
              <p className="empty-message">Start searching to find photos and users</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
