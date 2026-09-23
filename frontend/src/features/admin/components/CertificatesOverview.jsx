import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllCertificates } from '../services/admin.service';
import './CertificatesOverview.css';

const API_BASE_URL = 'http://localhost:3000';

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const getFileUrl = (fileUrl) => {
  if (!fileUrl) {
    return '';
  }

  if (
    fileUrl.startsWith('http://') ||
    fileUrl.startsWith('https://')
  ) {
    return fileUrl;
  }

  return `${API_BASE_URL}${fileUrl}`;
};

const CertificatesOverview = () => {
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await getAllCertificates();

      setCertificates(response?.certificates || []);
    } catch (err) {
      setError(
        err.message || 'Unable to load certificates.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchCertificates = async () => {
      try {
        const response = await getAllCertificates();

        if (isMounted) {
          setCertificates(
            response?.certificates || []
          );
          setError('');
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message ||
              'Unable to load certificates.'
          );
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    fetchCertificates();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section
      className="certificates-overview"
      aria-labelledby="certificates-overview-title"
    >
      <div className="certificates-overview-header">
        <div>
          <p className="certificates-overview-eyebrow">
            CERTIFICATE OVERSIGHT
          </p>

          <h2 id="certificates-overview-title">
            Generated certificates
          </h2>

          <p>
            Review certificate records and access
            finalized PDF files.
          </p>
        </div>

        <button
          type="button"
          className="certificates-overview-refresh"
          onClick={loadCertificates}
          disabled={loading || initialLoading}
        >
          {loading || initialLoading
            ? 'Refreshing…'
            : 'Refresh'}
        </button>
      </div>

      {initialLoading && (
        <div className="certificates-overview-state">
          Loading certificates…
        </div>
      )}

      {!initialLoading && error && (
        <div
          className="certificates-overview-state certificates-overview-error"
          role="alert"
        >
          <p>{error}</p>

          <button
            type="button"
            className="certificates-overview-retry"
            onClick={loadCertificates}
            disabled={loading}
          >
            {loading ? 'Trying…' : 'Try again'}
          </button>
        </div>
      )}

      {!initialLoading &&
        !error &&
        certificates.length === 0 && (
          <div className="certificates-overview-state">
            No certificates have been generated yet.
          </div>
        )}

      {!initialLoading &&
        !error &&
        certificates.length > 0 && (
          <div className="certificates-table-wrap">
            <table className="certificates-table">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Certificate</th>
                  <th>Request</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {certificates.map((certificate) => {
                  const user = certificate.userId || {};
                  const request = certificate.requestId || {};

                  const fileUrl = getFileUrl(
                    certificate.fileUrl
                  );

                  const certificateId =
                    certificate._id ||
                    certificate.id;

                  return (
                    <tr key={certificateId}>
                      <td>
                        <div className="certificate-intern">
                          <strong>
                            {user.fullName ||
                              'Unknown intern'}
                          </strong>

                          <span>
                            {user.email ||
                              'No email'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="certificate-type">
                          <strong>
                            {certificate.certificateType
                              ?.replaceAll(
                                '_',
                                ' '
                              ) || '—'}
                          </strong>

                          <span>
                            {certificate.internCode ||
                              user.internCode ||
                              '—'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="certificate-request-number">
                          {request.requestNumber ||
                            '—'}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`certificate-status ${
                            certificate.status ||
                            'unknown'
                          }`}
                        >
                          {certificate.status ||
                            'unknown'}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          certificate.createdAt
                        )}
                      </td>

                      <td>
                        <div className="certificate-actions">
                          {certificate.status === 'draft' && (
                            <button
                              type="button"
                              className="certificate-action review"
                              onClick={() =>
                                navigate(
                                  `/admin/certificates/${certificateId}/review`
                                )
                              }
                            >
                              Review / Edit
                            </button>
                          )}

                          {fileUrl && (
                            <>
                              <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="certificate-action view"
                              >
                                View PDF
                              </a>

                              <a
                                href={fileUrl}
                                download
                                className="certificate-action download"
                              >
                                Download
                              </a>
                            </>
                          )}

                          {!fileUrl &&
                            certificate.status !== 'draft' && (
                              <span className="certificate-no-file">
                                No PDF
                              </span>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
    </section>
  );
};

export default CertificatesOverview;