import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import connectDB from '@/lib/mongodb';
import Post from '@/lib/models/Post';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function getUserFromToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    return jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET!) as any;
  } catch {
    return null;
  }
}

function extractS3Key(value: string): string | null {
  if (!value) return null;
  if (!value.includes('://')) return value;
  try {
    const url = new URL(value);
    if (url.hostname.includes('amazonaws.com')) return url.pathname.replace(/^\//, '');
  } catch {}
  return null;
}

// PATCH /api/posts/[id] — edit caption
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  await connectDB();
  const { id } = await params;
  const { content } = await req.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Caption cannot be empty' }, { status: 400 });
  }

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  // only the owner can edit
  if (post.userId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  post.content = content.trim();
  await post.save();

  return NextResponse.json({ message: 'Caption updated', content: post.content });
}

// DELETE /api/posts/[id] — delete post + S3 object
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUserFromToken(req);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  await connectDB();
  const { id } = await params;

  const post = await Post.findById(id);
  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

  // only the owner can delete
  if (post.userId !== user.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // delete from S3 if there's an image
  const key = extractS3Key(post.imageUrl);
  if (key) {
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET_NAME!, Key: key }));
    } catch (err) {
      console.error('S3 delete failed (continuing):', err);
      // don't block the DB delete if S3 fails
    }
  }

  await Post.findByIdAndDelete(id);

  return NextResponse.json({ message: 'Post deleted' });
}
