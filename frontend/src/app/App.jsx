import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/pages/Login';
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


        <Route element={<ProtectedRoute allowedRoles={['intern']} />}>
          <Route path="/intern/dashboard" element={<InternDashboard />} />
        </Route>


        <Route element={<ProtectedRoute allowedRoles={['teamleader']} />}>
          <Route path="/teamleader/dashboard" element={<TLDashboard />} />
        </Route>


       <Route path="/admin/certificate-review" element={<CertificateReviewPage />} />

<Route element={<ProtectedRoute allowedRoles={['admin']} />}>
  <Route path="/admin/dashboard" element={<AdminDashboard />} />
</Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}