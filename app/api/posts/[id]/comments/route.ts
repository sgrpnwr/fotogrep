import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Post from '@/lib/models/Post';

function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as any;
  } catch {
    return null;
  }
}

// GET /api/posts/[id]/comments
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectDB();
  const { id } = await params;
  const post = await Post.findById(id).select('comments');
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  return NextResponse.json({ comments: post.comments });
}

// POST /api/posts/[id]/comments — add a comment
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { text } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: 'Comment text is required' }, { status: 400 });
  }

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const comment = { userId: user.userId, username: user.username, text: text.trim(), createdAt: new Date() };
  post.comments.push(comment);
  await post.save();

  return NextResponse.json({ comment: post.comments[post.comments.length - 1] }, { status: 201 });
}
