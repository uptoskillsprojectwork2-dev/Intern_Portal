import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from '../features/auth/pages/Login';

import InternDashboard from '../features/Intern/pages/InternDashboard';
import CertificateRequest from '../features/Intern/certificate-request/CertificateRequest';

import HRDashboard from '../features/auth/pages/HRDashboard';
import CertificateRequests from '../features/HR/CertificateRequests';

import AdminDashboard from '../features/auth/pages/AdminDashboard';

import ThemeToggle from '../features/shared/components/ThemeToggle';

import './App.css';

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      theme
    );

    localStorage.setItem(
      'theme',
      theme
    );
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) =>
      prevTheme === 'dark'
        ? 'light'
        : 'dark'
    );
  };

  return (
    <>
      <ThemeToggle
        theme={theme}
        onToggle={toggleTheme}
      />

      <Routes>

        {/* ==================================================
            LOGIN
        ================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* ==================================================
            INTERN
        ================================================== */}

        <Route
          path="/intern/dashboard"
          element={<InternDashboard />}
        />

        <Route
          path="/intern/profile"
          element={<InternDashboard />}
        />

        <Route
          path="/intern/certificates"
          element={<InternDashboard />}
        />

        <Route
          path="/intern/notifications"
          element={<InternDashboard />}
        />

        <Route
          path="/intern/certificate-request"
          element={<CertificateRequest />}
        />


        {/* ==================================================
            HR
        ================================================== */}

        <Route
          path="/hr/dashboard"
          element={<HRDashboard />}
        />

        <Route
          path="/hr/certificate-requests"
          element={<CertificateRequests />}
        />


        {/* ==================================================
            ADMIN
        ================================================== */}

        <Route
          path="/admin/dashboard"
          element={<AdminDashboard />}
        />


        {/* ==================================================
            DEFAULT
        ================================================== */}

        <Route
          path="/"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />

      </Routes>
    </>
  );
}