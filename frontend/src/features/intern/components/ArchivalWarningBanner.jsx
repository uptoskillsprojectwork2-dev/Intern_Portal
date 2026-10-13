import './ArchivalWarningBanner.css';

export default function ArchivalWarningBanner({ endDate, graceDays = 30 }) {
  if (!endDate) return null;

  const today = new Date();
  const end = new Date(endDate);

  // Archive date = end + graceDays
  const archiveDate = new Date(end.getTime() + graceDays * 24 * 60 * 60 * 1000);
  const diffMs = archiveDate - today;
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  // Show banner only if account will be archived within 7 days
  if (daysLeft < 0 || daysLeft > 7) {
    return null;
  }

  return (
    <div className="archival-warning-banner" role="alert">
      <div className="warning-banner-icon">⚠️</div>
      <div className="warning-banner-text">
        <strong>Account Archival Notice</strong>
        <p>
          Your internship account is scheduled for automatic archival in <strong>{daysLeft === 0 ? 'today' : `${daysLeft} day(s)`}</strong>.
          Please request or download any required certificates before archival.
        </p>
      </div>
    </div>
  );
}
