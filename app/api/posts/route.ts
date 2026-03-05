import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import connectDB from '@/lib/mongodb';
import Post from '@/lib/models/Post';
import User from '@/lib/models/User';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Extract the S3 key from either a bare key ("posts/uuid.jpg")
// or a full S3 URL ("https://bucket.s3.region.amazonaws.com/posts/uuid.jpg")
function extractS3Key(value: string): string | null {
  if (!value) return null;
  if (!value.includes('://')) return value; // already a key
  try {
    const url = new URL(value);
    if (url.hostname.includes('amazonaws.com')) {
      return url.pathname.replace(/^\//, ''); // strip leading slash
    }
  } catch {}
  return null;
}

async function attachPresignedUrls(posts: any[]): Promise<any[]> {
  return Promise.all(
    posts.map(async (post) => {
      const p = post.toObject();
      const key = extractS3Key(p.imageUrl);
      if (key) {
        const cmd = new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME!, Key: key });
        p.imageUrl = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
      }
      return p;
    })
  );
}

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

    if (type === 'explore') {
      posts = await Post.find().sort({ createdAt: -1 }).limit(20);
    } else if (type === 'feed') {
      const user = getUserFromToken(req);
      if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

      const currentUser = await User.findById(user.userId);
      if (!currentUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

      if (currentUser.following.length === 0) {
        return NextResponse.json({ posts: [], message: 'Follow some people to see their posts here' });
      }

      posts = await Post.find({ userId: { $in: currentUser.following } })
        .sort({ createdAt: -1 })
        .limit(20);
    } else if (type === 'me') {
      const user = getUserFromToken(req);
      if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

      posts = await Post.find({ userId: user.userId }).sort({ createdAt: -1 }).limit(20);
    } else {
      return NextResponse.json({ error: 'Invalid type. Use: explore, feed, or me' }, { status: 400 });
    }

    const postsWithUrls = await attachPresignedUrls(posts);
    return NextResponse.json({ posts: postsWithUrls });

  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}

// POST — create a new post
export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    await connectDB();

    const { content, type, imageUrl } = await req.json();

    if (!content || !type) {
      return NextResponse.json({ error: 'Content and type are required' }, { status: 400 });
    }

    if (!['text', 'photo'].includes(type)) {
      return NextResponse.json({ error: 'Type must be text or photo' }, { status: 400 });
    }

    const post = await Post.create({
      userId: user.userId,
      username: user.username,
      type,
      content,
      imageUrl: imageUrl || '', // stores the S3 key e.g. "posts/uuid.jpg"
    });

    return NextResponse.json({ message: 'Post created', post }, { status: 201 });

  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
