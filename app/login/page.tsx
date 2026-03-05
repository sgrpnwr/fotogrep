'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import '@/app/auth.css';

// ── Validation schema ────────────────────────────────────────
const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .matches(
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Enter a valid email with a domain (e.g., user@example.com)'
    ),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type LoginForm = yup.InferType<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: yupResolver(schema),
  });

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setSuccess('Account created! Sign in to continue.');
    }
  }, [searchParams]);

  const onSubmit = async (data: LoginForm) => {
    setServerError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Something went wrong');
        return;
      }

      localStorage.setItem('token', json.token);
      localStorage.setItem('user', JSON.stringify(json.user));

      router.push('/');

    } catch {
      setServerError('Something went wrong. Try again.');
    }
  };

  return (
    <div className="auth-container">

      {/* Logo */}
      <div className="auth-header">
        <h1 className="auth-title">fotogrep</h1>
        <p className="auth-subtitle">welcome back.</p>
      </div>

      {/* Success banner */}
      {success && (
        <div className="success-banner">
          <p>{success}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">

        {/* Email */}
        <div 
          className={`form-field ${focusedField === 'email' ? 'focused' : ''} ${errors.email ? 'error' : ''}`}>
          <p className="field-label">Email</p>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.email && (
            <p className="error-message">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div 
          className={`form-field ${focusedField === 'password' ? 'focused' : ''} ${errors.password ? 'error' : ''}`}
          style={{ marginBottom: 8 }}>
          <p className="field-label">Password</p>
          <div className="password-wrapper">
            <input
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              placeholder="your password"
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className="password-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          {errors.password && (
            <p className="error-message">{errors.password.message}</p>
          )}
        </div>

        {/* Server error */}
        {serverError && (
          <p style={{ color: 'var(--error)', fontSize: 13, padding: '0 4px' }}>
            {serverError}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="submit-button"
        >
          {isSubmitting ? 'signing in...' : 'sign in'}
        </button>

      </form>

      {/* Signup link */}
      <p className="auth-footer">
        new to fotogrep?{' '}
        <Link href="/signup">create account</Link>
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