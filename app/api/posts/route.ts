import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';

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

// GET posts — explore / feed / my posts
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'explore';

    let posts;

    // ── explore: everyone's posts ──────────────────────────
    if (type === 'explore') {
      posts = await Post.find()
        .sort({ createdAt: -1 })
        .limit(20);
    }

    // ── feed: only people you follow ───────────────────────
    else if (type === 'feed') {
      const user = getUserFromToken(req);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorised' },
          { status: 401 }
        );
      }

      // get current user's following list
      const currentUser = await User.findById(user.userId);
      if (!currentUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      const followingList = currentUser.following;

      // if not following anyone yet, return empty array
      if (followingList.length === 0) {
        return NextResponse.json({ 
          posts: [],
          message: 'Follow some people to see their posts here'
        });
      }

      posts = await Post.find({ 
        userId: { $in: followingList } 
      })
      .sort({ createdAt: -1 })
      .limit(20);
    }

    // ── me: only my own posts ───────────────────────────────
    else if (type === 'me') {
      const user = getUserFromToken(req);
      if (!user) {
        return NextResponse.json(
          { error: 'Unauthorised' },
          { status: 401 }
        );
      }

      posts = await Post.find({ 
        userId: user.userId 
      })
      .sort({ createdAt: -1 })
      .limit(20);
    }

    // ── unknown type ────────────────────────────────────────
    else {
      return NextResponse.json(
        { error: 'Invalid type. Use: explore, feed, or me' },
        { status: 400 }
      );
    }

    return NextResponse.json({ posts });

  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

// POST — create a new post
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

    if (!['text', 'photo'].includes(type)) {
      return NextResponse.json(
        { error: 'Type must be text or photo' },
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