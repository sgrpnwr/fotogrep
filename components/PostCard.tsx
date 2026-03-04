import React from 'react';

interface PostCardProps {
  id: string;
  title: string;
  content: string;
  author?: string;
  createdAt?: string;
}

export default function PostCard({
  id,
  title,
  content,
  author,
  createdAt,
}: PostCardProps) {
  return (
    <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
      <h2 className="text-lg font-semibold mb-2">{title}</h2>
      <p className="text-gray-700 mb-3">{content}</p>
      <div className="flex justify-between text-sm text-gray-500">
        {author && <span>{author}</span>}
        {createdAt && <span>{createdAt}</span>}
      </div>
    </div>
  );
}
