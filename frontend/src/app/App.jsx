import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/pages/Login';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';
import ProtectedRoute from '../features/shared/components/ProtectedRoute';
import InternDashboard from '../features/intern/pages/InternDashboard';
import TLDashboard from '../features/teamleader/pages/TLDashboard';
import AdminDashboard from '../features/admin/pages/AdminDashboard';
import CertificateReviewPage from '../features/admin/pages/CertificateReviewPage';
import ThemeToggle from '../features/shared/components/ThemeToggle';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') ||
      (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <Routes>
        {/* Login page without theme toggle control */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={
          <>
            <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
            <ForgotPasswordPage />
          </>
        } />
        <Route path="/reset-password/:token" element={
          <>
            <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
            <ResetPasswordPage />
          </>
        } />

        {/* Intern dashboard */}
        <Route element={<ProtectedRoute allowedRoles={['intern']} />}>
          <Route path="/intern/dashboard" element={
            <InternDashboard theme={theme} onToggleTheme={toggleTheme} />
          } />
        </Route>

        {/* Team Leader dashboard */}
        <Route element={<ProtectedRoute allowedRoles={['teamleader']} />}>
          <Route path="/teamleader/dashboard" element={
            <TLDashboard theme={theme} onToggleTheme={toggleTheme} />
          } />
        </Route>

        {/* Admin dashboard — ThemeToggle lives in AdminDashboard's topbar */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={
            <AdminDashboard theme={theme} onToggleTheme={toggleTheme} />
          } />
          <Route path="/admin/certificates/:id/review" element={
            <CertificateReviewPage theme={theme} onToggleTheme={toggleTheme} />
          } />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}