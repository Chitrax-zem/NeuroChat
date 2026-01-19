import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import SettingsPanel from './components/SettingsPanel';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatPage from './pages/ChatPage';
import AnalyticsPage from './pages/AnalyticsPage';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppContent = () => {
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  return (
    <>
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat/:chatId?"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AnalyticsPage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <SettingsPanel
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter
     future={{
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  }}
    >
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

export default App;