import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../features/auth/pages/Login';
import ProtectedRoute from '../features/shared/components/ProtectedRoute';
import InternDashboard from '../features/auth/pages/InternDashboard';
import HRDashboard from '../features/auth/pages/HRDashboard';
import AdminDashboard from '../features/auth/pages/AdminDashboard';
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


        <Route element={<ProtectedRoute allowedRoles={['hr']} />}>
          <Route path="/hr/dashboard" element={<HRDashboard />} />
        </Route>


        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Route>


        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}