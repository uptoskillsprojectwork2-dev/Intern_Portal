import { useEffect, useState } from "react";
import {
  getAllCertificates,
  downloadCertificatePdf,
} from "../services/admin.service";
import StatusBadge from "../../shared/components/StatusBadge";
import Loading from "../../shared/components/Loading";
import Toast from "../../shared/components/Toast";
import "./CertificatesOverview.css";
import { useNavigate } from "react-router-dom";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function CertificatesOverview() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getAllCertificates();

      setCertificates(response.certificates || []);
    } catch (err) {
      setError(err.message || "Failed to load certificates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = async (id, certificateNumber) => {
    try {
      setDownloadingId(id);
      setError(null);

      const response = await downloadCertificatePdf(id);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${certificateNumber || "certificate"}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Failed to download certificate.");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return <Loading message="Loading certificates..." />;
  }

  return (
    <section
      className="certificates-overview"
      aria-labelledby="certificates-overview-title"
    >
      <div className="certificates-overview-heading">
        <div>
          <p className="admin-eyebrow">CERTIFICATE DESK</p>

          <h2 id="certificates-overview-title">Certificates Overview</h2>

          <p>View generated certificates and their current status.</p>
        </div>

        <button
          type="button"
          className="certificates-refresh-button"
          onClick={fetchCertificates}
        >
          Refresh
        </button>
      </div>

      <Toast message={error} type="error" onClose={() => setError(null)} />

      {!error && !certificates.length && (
        <p className="certificates-overview-state">No certificates found.</p>
      )}

      {certificates.length > 0 && (
        <div className="certificates-table-wrap">
          <table className="certificates-table">
            <thead>
              <tr>
                <th>Certificate</th>
                <th>Intern</th>
                <th>Type</th>
                <th>Status</th>
                <th>Issued</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {certificates.map((certificate) => (
                <tr key={certificate._id}>
                  <td>{certificate.certificateNumber || "—"}</td>

                  <td>{certificate.userId?.fullName || "—"}</td>

                  <td>
                    {certificate.certificateType?.replaceAll("_", " ") || "—"}
                  </td>

                  <td>
                    <StatusBadge status={certificate.status} />
                  </td>

                  <td>{formatDate(certificate.issuedDate)}</td>

                  <td>
                    <div className="certificate-actions">
                      {certificate.status === "draft" && (
                        <button
                          type="button"
                          className="certificate-action-button"
                          onClick={() =>
                            navigate(`/admin/certificates/${certificate._id}`)
                          }
                        >
                          Review
                        </button>
                      )}

                      {certificate.status === "finalized" &&
                        certificate.pdfPath && (
                          <button
                            type="button"
                            className="certificate-action-button"
                            onClick={() =>
                              handleDownload(
                                certificate._id,
                                certificate.certificateNumber,
                              )
                            }
                            disabled={downloadingId === certificate._id}
                          >
                            {downloadingId === certificate._id
                              ? "Downloading..."
                              : "Download PDF"}
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
