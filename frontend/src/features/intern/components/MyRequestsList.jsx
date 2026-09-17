import useCertificateRequests from "../hooks/useCertificateRequests";
import { downloadCertificateForRequest } from "../services/intern.api";
import { useState } from "react";
import StatusBadge from "../../shared/components/StatusBadge";
import "./MyRequestsList.css";

const formatDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

export default function MyRequestsList() {
  const { requests, loading, error, refetch } = useCertificateRequests();
  const [downloadingId, setDownloadingId] = useState(null);
  const handleDownload = async (id) => {
    try {
      setDownloadingId(id);

      const response = await downloadCertificateForRequest(id);

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${id}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download certificate:", err);
    } finally {
      setDownloadingId(null);
    }
  };
  return (
    <section className="requests-panel" aria-labelledby="my-requests-title">
      <div className="requests-panel-heading">
        <div>
          <p className="request-eyebrow">REQUEST HISTORY</p>
          <h2 id="my-requests-title">My certificate requests</h2>
        </div>
        <button className="requests-refresh" type="button" onClick={refetch}>
          Refresh
        </button>
      </div>
      {loading && <p className="requests-state">Loading requests…</p>}
      {!loading && error && (
        <p className="requests-state requests-error" role="alert">
          {error}
        </p>
      )}
      {!loading && !error && !requests.length && (
        <p className="requests-state">No requests yet</p>
      )}
      {!loading && !error && requests.length > 0 && (
        <div className="requests-table-wrap">
          <table className="requests-table">
            <thead>
              <tr>
                <th>Request</th>
                <th>Certificate</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => (
                <tr key={request._id || request.id || request.requestNumber}>
                  <td>{request.requestNumber || "—"}</td>
                  <td>
                    {request.certificateType?.replaceAll("_", " ") || "—"}
                  </td>
                  <td>
                    <StatusBadge status={request.status} />
                  </td>
                  <td>
                    {formatDate(request.requestedAt || request.createdAt)}
                  </td>
                  <td>
                    {request.status === "completed" && (
                      <button
                        type="button"
                        className="certificate-download-button"
                        onClick={() => handleDownload(request._id)}
                        disabled={downloadingId === request._id}
                      >
                        {downloadingId === request._id
                          ? "Downloading..."
                          : "Download Certificate"}
                      </button>
                    )}
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
