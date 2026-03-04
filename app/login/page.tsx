'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setSuccess('Account created! Sign in to continue.');
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        return;
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      router.push('/');

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
          welcome back.
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div style={{
          padding: '12px 16px',
          background: '#0F2A1A',
          border: '1px solid #1A4A2A',
          borderRadius: 8,
          marginBottom: 16,
        }}>
          <p style={{
            color: '#4CAF7A',
            fontSize: 13,
          }}>{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>

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
            placeholder="your password"
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
          {loading ? 'signing in...' : 'sign in'}
        </button>

      </form>

      {/* Signup link */}
      <p style={{
        marginTop: 32,
        color: 'var(--muted)',
        fontSize: 13,
        textAlign: 'center',
        letterSpacing: 0.3,
      }}>
        new to fotogrep?{' '}
        <Link href="/signup" style={{
          color: 'var(--accent)',
          letterSpacing: 0.5,
        }}>
          create account
        </Link>
      </p>

    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}