import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { firstName, lastName, gender, username, email, password } = await req.json();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    const allowedGenders = ['male', 'female', 'non-binary', 'other', 'prefer_not_to_say'];

    // Validation – mirror frontend yup schema
    if (
      !firstName ||
      typeof firstName !== 'string' ||
      firstName.trim().length === 0 ||
      firstName.trim().length > 50
    ) {
      return NextResponse.json(
        { error: 'First name is required and must be under 50 characters' },
        { status: 400 }
      );
    }

    if (
      !lastName ||
      typeof lastName !== 'string' ||
      lastName.trim().length === 0 ||
      lastName.trim().length > 50
    ) {
      return NextResponse.json(
        { error: 'Last name is required and must be under 50 characters' },
        { status: 400 }
      );
    }

    if (!gender || typeof gender !== 'string' || !allowedGenders.includes(gender)) {
      return NextResponse.json(
        { error: 'Please select a valid gender option' },
        { status: 400 }
      );
    }

    if (
      !username ||
      typeof username !== 'string' ||
      username.length < 3 ||
      username.length > 20 ||
      !usernameRegex.test(username)
    ) {
      return NextResponse.json(
        { error: 'Username must be 3–20 characters and use only letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email with a domain (e.g., user@example.com)' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email or username already taken' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      gender,
      username,
      email,
      password: hashedPassword,
    });

    return NextResponse.json({
      message: 'Account created successfully',
      userId: user._id,
      username: user.username,
    }, { status: 201 });

  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}