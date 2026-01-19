import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, LogOut, Settings, User } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon">🧠</div>
          <span className="logo-text">NeuroChat</span>
        </Link>

        <div className="navbar-actions">
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title="Toggle theme"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          {isAuthenticated ? (
            <>
              <div className="user-menu">
                <div className="user-avatar">
                  <User size={20} />
                </div>
                <span className="user-name">{user?.username}</span>
              </div>

              <button
                className="logout-btn"
                onClick={handleLogout}
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;