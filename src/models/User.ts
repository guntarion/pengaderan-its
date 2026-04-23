// src/models/User.ts
import mongoose, { Schema, models } from 'mongoose';

export interface IUser {
  _id?: string;
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: 'admin' | 'member' | 'moderator' | 'editor' | 'viewer' | 'guest';
  namaPanggilan?: string;
  nomerHandphone?: string;
  gender?: 'lelaki' | 'perempuan';
  tanggalLahir?: Date;
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },
  image: {
    type: String,
  },
  role: {
    type: String,
    enum: ['admin', 'member', 'moderator', 'editor', 'viewer', 'guest'],
    default: 'member',
  },
  namaPanggilan: {
    type: String,
  },
  nomerHandphone: {
    type: String,
  },
  gender: {
    type: String,
    enum: ['lelaki', 'perempuan'],
  },
  tanggalLahir: {
    type: Date,
  },
  resetToken: {
    type: String,
  },
  resetTokenExpiry: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Check if the model already exists before creating a new one
const User = models.User || mongoose.model<IUser>('User', userSchema);

export default User;
