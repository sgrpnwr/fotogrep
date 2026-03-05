'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import '@/app/auth.css';


// ── Validation schema ────────────────────────────────────────
const schema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .max(50, 'First name must be under 50 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .max(50, 'Last name must be under 50 characters'),
  gender: yup
    .string()
    .oneOf(
      ['male', 'female', 'non-binary', 'other', 'prefer_not_to_say'],
      'Please select a valid option'
    )
    .required('Gender is required'),
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
  const [focusedField, setFocusedField] = useState<
    'firstName' | 'lastName' | 'gender' | 'username' | 'email' | 'password' | null
  >(null);
  const [showPassword, setShowPassword] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'error'>('idle');

  const {
    register,
    handleSubmit,
    getValues,
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

  const handleUsernameBlur = async () => {
    setFocusedField(null);

    const username = getValues('username');

    if (!username || errors.username) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    try {
      const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(username)}`);

      if (!res.ok) {
        throw new Error('Failed to check username');
      }

      const data = await res.json();
      setUsernameStatus(data.available ? 'available' : 'taken');

    } catch {
      setUsernameStatus('error');
    }
  };

  return (
    <div className="auth-container">

      {/* Logo */}
      <div className="auth-header">
        <h1 className="auth-title">fotogrep</h1>
        <p className="auth-subtitle">find your shot.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="auth-form">

        {/* First name */}
        <div 
          className={`form-field ${focusedField === 'firstName' ? 'focused' : ''} ${errors.firstName ? 'error' : ''}`}>
          <p className="field-label">First name</p>
          <input
            {...register('firstName')}
            placeholder="John"
            autoComplete="given-name"
            onFocus={() => setFocusedField('firstName')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.firstName && (
            <p className="error-message">{errors.firstName.message}</p>
          )}
        </div>

        {/* Last name */}
        <div 
          className={`form-field ${focusedField === 'lastName' ? 'focused' : ''} ${errors.lastName ? 'error' : ''}`}>
          <p className="field-label">Last name</p>
          <input
            {...register('lastName')}
            placeholder="Doe"
            autoComplete="family-name"
            onFocus={() => setFocusedField('lastName')}
            onBlur={() => setFocusedField(null)}
          />
          {errors.lastName && (
            <p className="error-message">{errors.lastName.message}</p>
          )}
        </div>

        {/* Gender */}
        <div 
          className={`form-field ${focusedField === 'gender' ? 'focused' : ''} ${errors.gender ? 'error' : ''}`}>
          <p className="field-label">Gender</p>
          <select
            {...register('gender')}
            className="select-input"
            onFocus={() => setFocusedField('gender')}
            onBlur={() => setFocusedField(null)}
            defaultValue=""
          >
            <option value="" disabled>
              Select gender
            </option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
          {errors.gender && (
            <p className="error-message">{errors.gender.message}</p>
          )}
        </div>

        {/* Username */}
        <div 
          className={`form-field ${focusedField === 'username' ? 'focused' : ''} ${errors.username ? 'error' : ''}`}>
          <p className="field-label">Username</p>
          <input
            {...register('username')}
            placeholder="yourname"
            autoComplete="off"
            onFocus={() => setFocusedField('username')}
            onBlur={handleUsernameBlur}
          />
          {errors.username && (
            <p className="error-message">{errors.username.message}</p>
          )}
          {usernameStatus === 'checking' && (
            <p className="field-status">checking username...</p>
          )}
          {usernameStatus === 'available' && (
            <p className="success-message">username is available</p>
          )}
          {usernameStatus === 'taken' && (
            <p className="error-message">username is already taken</p>
          )}
          {usernameStatus === 'error' && (
            <p className="error-message">could not check username, try again</p>
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
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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