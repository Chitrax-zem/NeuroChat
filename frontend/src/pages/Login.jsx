import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailRef = useRef(null);

  React.useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        navigate('/chat');
      } else {
        setError(result.message || 'Login failed');
        triggerShake();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-large spin" aria-hidden="true">
            <Brain size={48} />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to continue to NeuroChat</p>
        </div>

        <form className={`auth-form ${shake ? 'form-shake' : ''}`} onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              ref={emailRef}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
              className="form-input"
            />
            <div className="input-hint">Use the email you registered with.</div>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={18} />
              Password
            </label>
            <div className="input-with-action">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete={remember ? 'current-password' : 'off'}
                className="form-input"
              />
              <button
                type="button"
                className="input-action-btn"
                aria-label={showPw ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw((s) => !s)}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-hints">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="link">Forgot password?</Link>
          </div>

          <button type="submit" className="btn btn-primary btn-large" disabled={loading}>
            {loading ? (
              <>
                Signing in...
                <span className="spinner" />
              </>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="form-footer">
            <span />
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="link">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
