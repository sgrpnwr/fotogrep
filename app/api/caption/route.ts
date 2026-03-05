import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(req: NextRequest) {
  try {
    const user = getUserFromToken(req);
    if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

    const { imageBase64, customQuery } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image base64 is required' }, { status: 400 });
    }

    // Remove the data URI prefix if present
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const query =
      `Idea for caption: ${customQuery}--> Generate a single-line caption (max 2 lines if necessary) for this image. Be concise, engaging, and descriptive. Return ONLY the caption text, nothing else.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
            {
              type: 'text',
              text: query,
            },
          ],
        },
      ],
    });

    // Extract text from the response
    const caption = response.choices[0]?.message?.content?.trim() || '';

    if (!caption) {
      return NextResponse.json(
        { error: 'Failed to generate caption' },
        { status: 500 }
      );
    }

    return NextResponse.json({ caption });
  } catch (error) {
    console.error('Caption generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate caption' },
      { status: 500 }
    );
  }
}
