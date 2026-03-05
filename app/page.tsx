'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PhotoGrid from '@/components/PhotoGrid';
import './home.css';

export interface Photo {
  id: string;
  content: string;
  imageUrl: string;
  username: string;
  likes: string[];   // array of userIds
  comments: number;
  createdAt: string;
}

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState('');
  const [showUploadSuccess, setShowUploadSuccess] = useState(false);

  const fetchPosts = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/posts?type=explore', {
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
      setPhotos(mapped);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUserId(user.id || '');
    setIsAuthenticated(true);
    fetchPosts(token);

    // Check for upload success query param
    const params = new URLSearchParams(window.location.search);
    
    if (params.get('uploaded') === 'true') {
      setShowUploadSuccess(true);
      // Refetch posts to include the new one
      const token = localStorage.getItem('token');
      if (token) fetchPosts(token);
      // Hide success toast after 3 seconds
      const timer = setTimeout(() => setShowUploadSuccess(false), 3000);
      // Remove query params from URL
      router.replace('/');
      return () => clearTimeout(timer);
    }
  }, [router, fetchPosts]);

  // Show loading while checking authentication
  if (!isAuthenticated && isLoading) return null;

  return (
    <div className="home-container">
      <Navbar onPostCreated={() => {
        const token = localStorage.getItem('token');
        if (token) fetchPosts(token);
      }} />

      {showUploadSuccess && (
        <div className="upload-success-toast">
          <span className="toast-icon">✅</span>
          <span className="toast-text">Photo posted successfully!</span>
        </div>
      )}

      <main className="home-main">
        {isLoading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading photos...</p>
          </div>
        ) : photos.length > 0 ? (
          <PhotoGrid photos={photos} currentUserId={currentUserId} />
        ) : (
          <div className="empty-state">
            <p className="empty-message">No photos yet. Start uploading!</p>
          </div>
        )}
      </main>
    </div>
  );
}
