'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import PhotoGrid from '@/components/PhotoGrid';
import { Photo } from '@/app/page';
import '../home.css';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; email: string } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyPosts = useCallback(async (token: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/posts?type=me', {
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
    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(stored);
    fetchMyPosts(token);
  }, [router, fetchMyPosts]);

  // remove deleted post from local list without refetching
  function handleDelete(postId: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== postId));
  }

  // update caption in local list without refetching
  function handleCaptionUpdate(postId: string, newCaption: string) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, content: newCaption } : p))
    );
  }

  if (!user) return null;

  return (
    <div className="profile-container">
      <Navbar />

      <div className="profile-header">
        <div className="profile-avatar">
          {user.username?.charAt(0).toUpperCase()}
        </div>
        <div className="profile-info">
          <h1 className="profile-username">{user.username}</h1>
          <p className="profile-email">{user.email}</p>
          <p className="profile-post-count">
            {isLoading ? '—' : photos.length} {photos.length === 1 ? 'post' : 'posts'}
          </p>
        </div>
      </div>

      <div className="profile-divider" />

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your posts...</p>
        </div>
      ) : photos.length > 0 ? (
        <PhotoGrid
          photos={photos}
          currentUserId={user.id}
          onDelete={handleDelete}
          onCaptionUpdate={handleCaptionUpdate}
        />
      ) : (
        <div className="empty-state">
          <p className="empty-message">You haven't posted anything yet.</p>
        </div>
      )}
    </div>
  );
}
