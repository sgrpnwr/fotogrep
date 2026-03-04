import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  profilePic: string;
  bio: string;
  followers: string[];
  following: string[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  username: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    minlength: 3
  },
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true 
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  profilePic: { 
    type: String, 
    default: '' 
  },
  bio: { 
    type: String, 
    default: '' 
  },
  followers: [{ type: String }],
  following: [{ type: String }],
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);