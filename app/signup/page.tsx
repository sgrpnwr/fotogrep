'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState } from 'react';
import '@/app/auth.css';


// ── Validation schema ────────────────────────────────────────
const schema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be under 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
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

// ── Type inferred from schema ────────────────────────────────
type SignupForm = yup.InferType<typeof schema>;

export default function SignupPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [focusedField, setFocusedField] = useState<'username' | 'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: SignupForm) => {
    setServerError('');

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Something went wrong');
        return;
      }

      router.push('/login?signup=success');

    } catch {
      setServerError('Something went wrong. Try again.');
    }
  };

  return (
    <div className="auth-container">

      {/* Logo */}
      <div className="auth-header">
        <h1 className="auth-title">fotogrep</h1>
        <p className="auth-subtitle">capture. share. repeat.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">

        {/* Username */}
        <div 
          className={`form-field ${focusedField === 'username' ? 'focused' : ''} ${errors.username ? 'error' : ''}`}>
          <p className="field-label">Username</p>
          <input
            {...register('username')}
            placeholder="yourname"
            autoComplete="off"
            onFocus={() => setFocusedField('username')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.username && (
            <p className="error-message">{errors.username.message}</p>
          )}
        </div>

        {/* Email */}
        <div 
          className={`form-field ${focusedField === 'email' ? 'focused' : ''} ${errors.email ? 'error' : ''}`}>
          <p className="field-label">Email</p>
          <input
            {...register('email')}
            type="email"
            placeholder="you@example.com"
            autoComplete="off"
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
              placeholder="min 6 characters"
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
          {isSubmitting ? 'creating account...' : 'join fotogrep'}
        </button>

      </form>

      {/* Login link */}
      <p className="auth-footer">
        already have an account?{' '}
        <Link href="/login">sign in</Link>
      </p>

    </div>
  );
}