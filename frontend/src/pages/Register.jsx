import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, User, Mail, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const usernameRef = useRef(null);

  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    setFormData((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateForm = () => {
    if (formData.username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Please enter a valid email');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 350);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const result = await register(
        formData.username.trim(),
        formData.email.trim(),
        formData.password
      );
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/chat');
        }, 1200);
      } else {
        setError(result.message || 'Registration failed');
        triggerShake();
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="logo-large success spin" aria-hidden="true">
              <CheckCircle size={48} />
            </div>
            <h1>Registration Successful!</h1>
            <p>Welcome to NeuroChat</p>
          </div>
          <div className="success-card">
            <p>You’ll be redirected to your chat shortly...</p>
          </div>
        </div>
      </div>
    );
  }

  const passwordStrengthHint =
    formData.password.length === 0
      ? 'Use at least 6 characters'
      : formData.password.length < 6
      ? 'Too short — add more characters'
      : 'Looks good';

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-large spin" aria-hidden="true">
            <Brain size={48} />
          </div>
          <h1>Create Account</h1>
          <p>Join NeuroChat and start chatting</p>
        </div>

        <form className={`auth-form ${shake ? 'form-shake' : ''}`} onSubmit={handleSubmit} noValidate>
          {error && (
            <div className="error-message" role="alert">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">
              <User size={18} />
              Username
            </label>
            <input
              id="username"
              type="text"
              name="username"
              ref={usernameRef}
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
              className="form-input"
            />
            <div className="input-hint">3–50 characters, unique.</div>
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={18} />
              Email Address
            </label>
            <input
              id="email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              required
              className="form-input"
              autoComplete="email"
            />
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password"
                required
                className="form-input"
                autoComplete="new-password"
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
            <div className={`input-hint ${formData.password && formData.password.length < 6 ? 'input-error' : ''}`}>
              {passwordStrengthHint}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              <Lock size={18} />
              Confirm Password
            </label>
            <div className="input-with-action">
              <input
                id="confirmPassword"
                type={showPw2 ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                required
                className="form-input"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="input-action-btn"
                aria-label={showPw2 ? 'Hide password' : 'Show password'}
                onClick={() => setShowPw2((s) => !s)}
              >
                {showPw2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {formData.confirmPassword && formData.confirmPassword !== formData.password && (
              <div className="input-error">Passwords do not match</div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={loading}
          >
            {loading ? (
              <>
                Creating account...
                <span className="spinner" />
              </>
            ) : (
              'Create Account'
            )}
          </button>

          <div className="form-footer">
            <span />
            <span>We’ll keep your data secure</span>
          </div>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
