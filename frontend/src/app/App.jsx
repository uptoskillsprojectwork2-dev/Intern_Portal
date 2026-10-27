
import { lazy, Suspense, useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Login from '../features/auth/pages/Login';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '../features/auth/pages/ResetPasswordPage';

import ProtectedRoute from '../features/shared/components/ProtectedRoute';
import ThemeToggle from '../features/shared/components/ThemeToggle';
import AccessDeniedPage from '../features/shared/components/AccessDeniedPage';
import CertificateVerificationPage from '../features/public/pages/CertificateVerificationPage';

import './App.css';

const CertificateReviewPage = lazy(() => import('../features/admin/pages/CertificateReviewPage'));
const CertificateTemplateEditorPage = lazy(() => import('../features/admin/pages/CertificateTemplateEditorPage'));
const InternDashboard = lazy(() => import('../features/intern/pages/InternDashboard'));
const TLDashboard = lazy(() => import('../features/teamleader/pages/TLDashboard'));
const AdminDashboard = lazy(() => import('../features/admin/pages/AdminDashboard'));

export default function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((previousTheme) =>
      previousTheme === 'dark' ? 'light' : 'dark'
    );
  };

  return (
    <>
      <ThemeToggle
        theme={theme}
        onToggle={toggleTheme}
      />

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/verify" element={<CertificateVerificationPage />} />

        <Route
          path="/verify/:certificateNumber"
          element={<CertificateVerificationPage />}
        />
        <Route path="/access-denied" element={<AccessDeniedPage />} />

        {/* =========================
            INTERN ROUTES
        ========================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={['intern']} />
          }
        >
          <Route
            path="/intern/dashboard"
            element={<Suspense fallback={<div role="status" className="route-loading">Loading intern dashboard…</div>}><InternDashboard /></Suspense>}
          />
          <Route
            path="/intern/settings"
            element={<Navigate to="/intern/dashboard?view=settings" replace />}
          />
        </Route>

        {/* =========================
            TEAM LEADER ROUTES
        ========================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={['teamleader']} />
          }
        >
          <Route
            path="/teamleader/dashboard"
            element={<Suspense fallback={<div role="status" className="route-loading">Loading Team Leader dashboard…</div>}><TLDashboard /></Suspense>}
          />
        </Route>

        {/* =========================
            ADMIN ROUTES
        ========================== */}

        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']} />
          }
        >
          <Route
            path="/admin/dashboard"
            element={<Suspense fallback={<div role="status" className="route-loading">Loading admin dashboard…</div>}><AdminDashboard /></Suspense>}
          />

          <Route
            path="/admin/certificates/:id/review"
            element={<Suspense fallback={<div role="status" className="route-loading">Loading certificate review…</div>}><CertificateReviewPage /></Suspense>}
          />

          <Route
            path="/admin/certificate-templates"
            element={<Suspense fallback={<div role="status" className="route-loading">Loading certificate templates…</div>}><CertificateTemplateEditorPage /></Suspense>}
          />
        </Route>

        {/* =========================
            DEFAULT ROUTES
        ========================== */}

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </>
  );
}
