import { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      await axios.post('http://localhost:8002/api/auth/forgot-password', {
        email: email
      });

      setSubmitted(true);
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-gradient-start) 0%, var(--primary-gradient-end) 100%)',
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        padding: '40px',
        width: '100%',
        maxWidth: '440px'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, var(--primary-gradient-start), var(--primary-gradient-end))',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '36px',
            color: 'white',
            boxShadow: '0 10px 30px rgba(102, 126, 234, 0.4)'
          }}>
            🔑
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--text-primary)',
            margin: '0 0 8px'
          }}>
            Forgot Password?
          </h1>
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '14px',
            margin: 0
          }}>
            {submitted
              ? 'Check your email for reset instructions'
              : 'Enter your email and we\'ll send you reset instructions'}
          </p>
        </div>

        {!submitted ? (
          <>
            {/* Error Message */}
            {error && (
              <div style={{
                background: '#fed7d7',
                color: '#c53030',
                padding: '12px 16px',
                borderRadius: '10px',
                marginBottom: '24px',
                fontSize: '14px',
                border: '1px solid #fc8181'
              }}>
                {error}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Email Input */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary)',
                  marginBottom: '8px'
                }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '14px',
                    border: '2px solid var(--border-light)',
                    borderRadius: '10px',
                    outline: 'none',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border-light)'}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'white',
                  background: loading
                    ? 'var(--border-medium)'
                    : 'linear-gradient(135deg, var(--primary-gradient-start), var(--primary-gradient-end))',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                  marginBottom: '20px'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                  }
                }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          </>
        ) : (
          <>
            {/* Success Message */}
            <div style={{
              background: '#c6f6d5',
              color: '#22543d',
              padding: '16px',
              borderRadius: '10px',
              marginBottom: '24px',
              fontSize: '14px',
              border: '1px solid #66bb6a',
              lineHeight: '1.6'
            }}>
              {message}
            </div>

            {/* Resend Button */}
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
                setMessage('');
              }}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '500',
                color: 'var(--primary-color)',
                background: 'white',
                border: '2px solid var(--primary-color)',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                marginBottom: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--primary-color)';
                e.currentTarget.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = 'var(--primary-color)';
              }}
            >
              Send Another Email
            </button>
          </>
        )}

        {/* Back to Login Link */}
        <div style={{ textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Remember your password?{' '}
          <Link
            to="/login"
            style={{
              color: 'var(--primary-color)',
              fontWeight: '600',
              textDecoration: 'none'
            }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
