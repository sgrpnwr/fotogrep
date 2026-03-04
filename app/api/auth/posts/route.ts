import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Post from '@/lib/models/Post';

// Helper to get user from token
function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as any;
  } catch {
    return null;
  }
}

// GET all posts (feed)
export async function GET() {
  try {
    await connectDB();

    const posts = await Post.find()
      .sort({ createdAt: -1 }) // newest first
      .limit(20);

    return NextResponse.json({ posts });

  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST create a new post
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorised' },
        { status: 401 }
      );
    }

    await connectDB();

    const { content, type } = await req.json();

    if (!content || !type) {
      return NextResponse.json(
        { error: 'Content and type are required' },
        { status: 400 }
      );
    }

    const post = await Post.create({
      userId: user.userId,
      username: user.username,
      type,
      content,
    });

    return NextResponse.json({ 
      message: 'Post created',
      post 
    }, { status: 201 });
    
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}