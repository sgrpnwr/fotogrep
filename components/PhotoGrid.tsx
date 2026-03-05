'use client';

import { useState } from 'react';
import { Photo } from '@/app/page';
import '../app/photo-grid.css';

interface Comment {
  _id: string;
  userId: string;
  username: string;
  text: string;
  createdAt: string;
}

interface PhotoGridProps {
  photos: Photo[];
  currentUserId: string;
  // optional — only passed from the profile page
  onDelete?: (postId: string) => void;
  onCaptionUpdate?: (postId: string, newCaption: string) => void;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function PhotoGrid({ photos, currentUserId, onDelete, onCaptionUpdate }: PhotoGridProps) {
  const [likeState, setLikeState] = useState<Record<string, { likes: string[]; loading: boolean }>>({});
  const [commentDrawer, setCommentDrawer] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // edit state — which card is being edited + its draft text
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // delete confirm — which card is pending confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  function getLikes(photo: Photo) {
    return likeState[photo.id]?.likes ?? photo.likes;
  }

  async function handleLike(photo: Photo) {
    if (likeState[photo.id]?.loading) return;
    const token = localStorage.getItem('token');
    const current = getLikes(photo);
    const alreadyLiked = current.includes(currentUserId);

    setLikeState((prev) => ({
      ...prev,
      [photo.id]: {
        loading: true,
        likes: alreadyLiked
          ? current.filter((id) => id !== currentUserId)
          : [...current, currentUserId],
      },
    }));

    try {
      await fetch(`/api/posts/${photo.id}/like`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setLikeState((prev) => ({ ...prev, [photo.id]: { loading: false, likes: prev[photo.id].likes } }));
    } catch {
      setLikeState((prev) => ({ ...prev, [photo.id]: { loading: false, likes: current } }));
    }
  }

  async function openComments(postId: string) {
    setCommentDrawer(postId);
    if (comments[postId]) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setComments((prev) => ({ ...prev, [postId]: data.comments || [] }));
    } catch {
      setComments((prev) => ({ ...prev, [postId]: [] }));
    }
  }

  async function submitComment(postId: string) {
    if (!commentText.trim() || commentLoading) return;
    setCommentLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const data = await res.json();
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), data.comment] }));
      setCommentText('');
    } finally {
      setCommentLoading(false);
    }
  }

  // ── owner actions ────────────────────────────────────────────

  function startEdit(photo: Photo) {
    setEditingId(photo.id);
    setEditDraft(photo.content);
  }

  async function saveEdit(postId: string) {
    if (!editDraft.trim() || editLoading) return;
    setEditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: editDraft.trim() }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const data = await res.json();
      onCaptionUpdate?.(postId, data.content); // tell the parent to update its state
      setEditingId(null);
    } catch {
      // stay in edit mode on error
    } finally {
      setEditLoading(false);
    }
  }

  async function confirmDelete(postId: string) {
    setDeleteLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      onDelete?.(postId);
      setConfirmDeleteId(null);
    } finally {
      setDeleteLoading(false);
    }
  }

  const showOwnerActions = !!onDelete && !!onCaptionUpdate;

  return (
    <div className="photo-grid-wrapper">
      <div className="photo-grid">
        {photos.map((photo) => {
          const likes = getLikes(photo);
          const liked = likes.includes(currentUserId);
          const isEditing = editingId === photo.id;
          const isConfirmingDelete = confirmDeleteId === photo.id;

          return (
            <div key={photo.id} className="photo-card">
              {photo.imageUrl && (
                <div className="photo-image-container">
                  <img src={photo.imageUrl} alt={photo.content} className="photo-image" />
                  <div className="photo-overlay">
                    <div className="photo-actions">
                      <button
                        className={`photo-action-btn${liked ? ' liked' : ''}`}
                        title="Like"
                        onClick={() => handleLike(photo)}
                      >
                        {liked ? '❤️' : '🤍'}
                      </button>
                      <button
                        className="photo-action-btn"
                        title="Comment"
                        onClick={() => openComments(photo.id)}
                      >
                        💬
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="photo-info">
                <div className="photo-header">
                  <div className="photo-user">
                    <div className="user-avatar-small">
                      {photo.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                      <p className="username">{photo.username}</p>
                      <p className="timestamp">{timeAgo(photo.createdAt)}</p>
                    </div>
                  </div>

                  {/* edit / delete buttons — only on profile page */}
                  {showOwnerActions && !isEditing && !isConfirmingDelete && (
                    <div className="owner-actions">
                      <button className="owner-btn edit-btn" onClick={() => startEdit(photo)} title="Edit caption">
                        ✏️
                      </button>
                      <button className="owner-btn delete-btn" onClick={() => setConfirmDeleteId(photo.id)} title="Delete post">
                        🗑️
                      </button>
                    </div>
                  )}
                </div>

                {/* caption — normal or edit mode */}
                {isEditing ? (
                  <div className="edit-caption-wrap">
                    <textarea
                      className="edit-caption-input"
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      maxLength={500}
                      autoFocus
                    />
                    <div className="edit-caption-actions">
                      <button
                        className="edit-save-btn"
                        onClick={() => saveEdit(photo.id)}
                        disabled={editLoading || !editDraft.trim()}
                      >
                        {editLoading ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        className="edit-cancel-btn"
                        onClick={() => setEditingId(null)}
                        disabled={editLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="photo-description">{photo.content}</p>
                )}

                {/* delete confirmation inline */}
                {isConfirmingDelete ? (
                  <div className="delete-confirm">
                    <p>Delete this post?</p>
                    <div className="delete-confirm-actions">
                      <button
                        className="delete-confirm-btn"
                        onClick={() => confirmDelete(photo.id)}
                        disabled={deleteLoading}
                      >
                        {deleteLoading ? 'Deleting…' : 'Yes, delete'}
                      </button>
                      <button
                        className="delete-cancel-btn"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleteLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}

                <div className="photo-stats">
                  <button className={`stat-btn${liked ? ' liked' : ''}`} onClick={() => handleLike(photo)}>
                    {liked ? '❤️' : '🤍'} {likes.length}
                  </button>
                  <button className="stat-btn" onClick={() => openComments(photo.id)}>
                    💬 {photo.comments}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comment drawer */}
      {commentDrawer && (
        <div className="comment-backdrop" onClick={() => { setCommentDrawer(null); setCommentText(''); }}>
          <div className="comment-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="comment-drawer-header">
              <h3>Comments</h3>
              <button onClick={() => { setCommentDrawer(null); setCommentText(''); }}>✕</button>
            </div>
            <div className="comment-list">
              {(comments[commentDrawer] || []).length === 0 ? (
                <p className="no-comments">No comments yet. Be the first!</p>
              ) : (
                (comments[commentDrawer] || []).map((c) => (
                  <div key={c._id} className="comment-item">
                    <div className="comment-avatar">{c.username.charAt(0).toUpperCase()}</div>
                    <div className="comment-body">
                      <span className="comment-username">{c.username}</span>
                      <span className="comment-text">{c.text}</span>
                      <span className="comment-time">{timeAgo(c.createdAt)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="comment-input-row">
              <input
                className="comment-input"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment(commentDrawer)}
              />
              <button
                className="comment-submit"
                onClick={() => submitComment(commentDrawer)}
                disabled={commentLoading || !commentText.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
