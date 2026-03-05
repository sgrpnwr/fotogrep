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

// POST /api/posts/[id]/like — toggle like
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  const alreadyLiked = post.likes.includes(user.userId);
  if (alreadyLiked) {
    post.likes = post.likes.filter((uid: string) => uid !== user.userId);
  } else {
    post.likes.push(user.userId);
  }
  await post.save();

  return NextResponse.json({ liked: !alreadyLiked, likesCount: post.likes.length });
}
