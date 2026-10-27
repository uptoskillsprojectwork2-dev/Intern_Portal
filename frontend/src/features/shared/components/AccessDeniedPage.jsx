import { Link } from 'react-router-dom';

export default function AccessDeniedPage() {
  return (
    <main className="portal-error-page" role="main">
      <h1>Access denied</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/login">Return to login</Link>
    </main>
  );
}
