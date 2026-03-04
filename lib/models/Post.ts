import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  userId: string;
  username: string;
  type: 'text' | 'photo';
  content: string;
  imageUrl: string;
  likes: string[];
  repostCount: number;
  createdAt: Date;
}

const PostSchema = new Schema<IPost>({
  userId: { 
    type: String, 
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['text', 'photo'], 
    required: true 
  },
  content: { 
    type: String, 
    required: true 
  },
  imageUrl: { 
    type: String, 
    default: '' 
  },
  likes: [{ type: String }],
  repostCount: { 
    type: Number, 
    default: 0 
  },
}, { timestamps: true });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);