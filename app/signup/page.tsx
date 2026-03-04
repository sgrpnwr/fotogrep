'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      router.push('/login?signup=success');

    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '0 24px',
      background: 'var(--bg)',
    }}>

      {/* Logo */}
      <div style={{ marginBottom: 48 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 300,
          letterSpacing: 6,
          color: 'var(--accent)',
          textTransform: 'lowercase',
        }}>
          fotogrep
        </h1>
        <p style={{
          color: 'var(--muted)',
          fontSize: 13,
          marginTop: 8,
          letterSpacing: 1,
        }}>
          capture. share. repeat.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>

        {/* Username */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <p style={{
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>Username</p>
          <input
            name="username"
            value={form.username}
            onChange={handleChange}
            placeholder="yourname"
            autoComplete="off"
          />
        </div>

        {/* Email */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}>
          <p style={{
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>Email</p>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            autoComplete="off"
          />
        </div>

        {/* Password */}
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '14px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          marginBottom: 8,
        }}>
          <p style={{
            fontSize: 10,
            color: 'var(--muted)',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>Password</p>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="min 6 characters"
          />
        </div>

        {/* Error */}
        {error && (
          <p style={{
            color: 'var(--error)',
            fontSize: 13,
            letterSpacing: 0.5,
            padding: '0 4px',
          }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 4,
            padding: '16px 0',
            background: loading ? 'var(--surface)' : 'var(--accent)',
            color: loading ? 'var(--muted)' : '#0A0A0A',
            border: loading ? '1px solid var(--border)' : 'none',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {loading ? 'creating account...' : 'join fotogrep'}
        </button>

      </form>

      {/* Login link */}
      <p style={{
        marginTop: 32,
        color: 'var(--muted)',
        fontSize: 13,
        textAlign: 'center',
        letterSpacing: 0.3,
      }}>
        already have an account?{' '}
        <Link href="/login" style={{
          color: 'var(--accent)',
          letterSpacing: 0.5,
        }}>
          sign in
        </Link>
      </p>

    </div>
  );
}