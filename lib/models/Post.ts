import mongoose, { Schema, Document } from 'mongoose';

export interface IComment {
  userId: string;
  username: string;
  text: string;
  createdAt: Date;
}

export interface IPost extends Document {
  userId: string;
  username: string;
  type: 'text' | 'photo';
  content: string;
  imageUrl: string;
  likes: string[];
  comments: IComment[];
  repostCount: number;
  createdAt: Date;
}

const CommentSchema = new Schema<IComment>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const PostSchema = new Schema<IPost>({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  type: { type: String, enum: ['text', 'photo'], required: true },
  content: { type: String, required: true },
  imageUrl: { type: String, default: '' },
  likes: [{ type: String }],
  comments: [CommentSchema],
  repostCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);
