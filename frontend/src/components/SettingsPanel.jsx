import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { X, Save, User, Globe, Palette, Shield, Moon, Sun } from 'lucide-react';

const SettingsPanel = ({ isOpen, onClose }) => {
  const { user, updateSettings } = useAuth();
  const { theme, setThemeMode } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    username: user?.username || '',
    preferredLanguage: user?.preferredLanguage || 'en',
    theme: theme // keep in sync with current theme
  });

  const tabs = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'appearance', icon: Palette, label: 'Appearance' },
    { id: 'preferences', icon: Globe, label: 'Preferences' },
    { id: 'security', icon: Shield, label: 'Security' }
  ];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी (Hindi)' },
    { code: 'es', name: 'Español (Spanish)' },
    { code: 'fr', name: 'Français (French)' },
    { code: 'de', name: 'Deutsch (German)' },
    { code: 'zh', name: '中文 (Chinese)' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      if (!formData.username.trim()) {
        setMessage({ type: 'error', text: 'Username cannot be empty' });
        return;
      }
      setLoading(true);
      const result = await updateSettings(formData);
      if (result.success) {
        setMessage({ type: 'success', text: 'Settings saved successfully!' });
        // Theme already previewed via setThemeMode on click; no action needed here
      } else {
        setMessage({ type: 'error', text: result.message || 'Failed to save settings' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 6000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="settings-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {message.text && (
            <div className={`message ${message.type}`}>
              {message.text}
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>Profile Settings</h3>

              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="form-input disabled"
                />
              </div>

              <div className="form-group">
                <label>Member Since</label>
                <input
                  type="text"
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}
                  disabled
                  className="form-input disabled"
                />
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h3>Appearance</h3>

              <div className="form-group">
                <label>Theme</label>
                <div className="theme-options">
                  <button
                    className={`theme-option ${formData.theme === 'light' ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, theme: 'light' }));
                      setThemeMode('light'); // immediate preview
                    }}
                  >
                    <Sun size={20} />
                    <span>Light</span>
                  </button>
                  <button
                    className={`theme-option ${formData.theme === 'dark' ? 'active' : ''}`}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, theme: 'dark' }));
                      setThemeMode('dark'); // immediate preview
                    }}
                  >
                    <Moon size={20} />
                    <span>Dark</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="settings-section">
              <h3>Preferences</h3>
              <div className="form-group">
                <label>Preferred Language</label>
                <select
                  name="preferredLanguage"
                  value={formData.preferredLanguage}
                  onChange={handleChange}
                  className="form-select"
                >
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="settings-section">
              <h3>Security</h3>
              <p className="security-info">
                Your account is protected with secure authentication.
              </p>
              <button className="btn btn-outline">
                Change Password
              </button>
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
