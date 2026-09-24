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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');


  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>

      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />


        <Route element={<ProtectedRoute allowedRoles={['intern']} />}>
          <Route path="/intern/dashboard" element={<InternDashboard />} />
        </Route>


        <Route element={<ProtectedRoute allowedRoles={['teamleader']} />}>
          <Route path="/teamleader/dashboard" element={<TLDashboard />} />
        </Route>


        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/certificates/:id/review" element={<CertificateReviewPage />} />
        </Route>


        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}