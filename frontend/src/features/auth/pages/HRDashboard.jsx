import React, { useState } from "react";

import {
    getPendingCertificateRequests,
    approveCertificateRequest,
    rejectCertificateRequest
} from "../../../api/hr.js";


const HRDashboard = () => {
    const [requests, setRequests] = useState([]);

    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);

    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const [showRequests, setShowRequests] = useState(false);


    /*
     * FETCH PENDING REQUESTS
     */
    const handleFetchPendingRequests = async () => {
        setLoading(true);
        setError("");
        setMessage("");

        try {
            const data = await getPendingCertificateRequests();

            setRequests(data.requests || []);
            setShowRequests(true);

        } catch (err) {
            console.error(
                "Failed to fetch pending requests:",
                err
            );

            setError(
                err.message ||
                "Failed to fetch pending certificate requests"
            );

        } finally {
            setLoading(false);
        }
    };


    /*
     * APPROVE REQUEST
     */
    const handleApprove = async (requestId) => {
        const confirmed = window.confirm(
            "Are you sure you want to approve this certificate request?"
        );

        if (!confirmed) {
            return;
        }

        setActionLoading(requestId);
        setError("");
        setMessage("");

        try {
            await approveCertificateRequest(requestId);

            setMessage(
                "Certificate request approved successfully."
            );

            // Remove approved request from pending list
            setRequests((previousRequests) =>
                previousRequests.filter(
                    (request) => request._id !== requestId
                )
            );

        } catch (err) {
            console.error(
                "Failed to approve certificate request:",
                err
            );

            setError(
                err.message ||
                "Failed to approve certificate request"
            );

        } finally {
            setActionLoading(null);
        }
    };


    /*
     * REJECT REQUEST
     */
    const handleReject = async (requestId) => {
        const rejectionReason = window.prompt(
            "Enter the reason for rejecting this certificate request:"
        );

        // User clicked Cancel
        if (rejectionReason === null) {
            return;
        }

        // Empty reason
        if (!rejectionReason.trim()) {
            setError(
                "Rejection reason is required."
            );
            return;
        }

        setActionLoading(requestId);
        setError("");
        setMessage("");

        try {
            await rejectCertificateRequest(
                requestId,
                rejectionReason
            );

            setMessage(
                "Certificate request rejected successfully."
            );

            // Remove rejected request from pending list
            setRequests((previousRequests) =>
                previousRequests.filter(
                    (request) => request._id !== requestId
                )
            );

        } catch (err) {
            console.error(
                "Failed to reject certificate request:",
                err
            );

            setError(
                err.message ||
                "Failed to reject certificate request"
            );

        } finally {
            setActionLoading(null);
        }
    };


    return (
        <div style={styles.container}>

            {/* HEADER */}
            <div style={styles.header}>

                <div>
                    <h1 style={styles.title}>
                        HR Dashboard
                    </h1>

                    <p style={styles.subtitle}>
                        Review and manage intern certificate requests.
                    </p>
                </div>

                <button
                    onClick={handleFetchPendingRequests}
                    disabled={loading}
                    style={styles.loadButton}
                >
                    {loading
                        ? "Loading..."
                        : "View Pending Certificate Requests"}
                </button>

            </div>


            {/* SUCCESS MESSAGE */}
            {message && (
                <div style={styles.success}>
                    {message}
                </div>
            )}


            {/* ERROR MESSAGE */}
            {error && (
                <div style={styles.error}>
                    {error}
                </div>
            )}


            {/* REQUESTS */}
            {showRequests && (
                <section style={styles.section}>

                    <div style={styles.sectionHeader}>

                        <h2 style={styles.sectionTitle}>
                            Pending Certificate Requests
                        </h2>

                        <span style={styles.count}>
                            {requests.length} pending
                        </span>

                    </div>


                    {requests.length === 0 ? (

                        <div style={styles.empty}>
                            <h3>No pending requests</h3>

                            <p>
                                There are currently no pending
                                certificate requests.
                            </p>
                        </div>

                    ) : (

                        <div style={styles.list}>

                            {requests.map((request) => {

                                const isProcessing =
                                    actionLoading === request._id;

                                return (
                                    <div
                                        key={request._id}
                                        style={styles.card}
                                    >

                                        {/* CARD HEADER */}
                                        <div
                                            style={
                                                styles.cardHeader
                                            }
                                        >

                                            <div>
                                                <h3
                                                    style={
                                                        styles.cardTitle
                                                    }
                                                >
                                                    Certificate Request
                                                </h3>

                                                <p
                                                    style={
                                                        styles.requestNumber
                                                    }
                                                >
                                                    Request No:{" "}
                                                    {request.requestNumber ||
                                                        "N/A"}
                                                </p>
                                            </div>

                                            <span
                                                style={
                                                    styles.pendingBadge
                                                }
                                            >
                                                pending
                                            </span>

                                        </div>


                                        {/* INTERN DETAILS */}
                                        <div
                                            style={
                                                styles.details
                                            }
                                        >

                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Intern Name
                                                </strong>

                                                <span>
                                                    {request.userId
                                                        ?.fullName ||
                                                        "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Intern Code
                                                </strong>

                                                <span>
                                                    {request.userId
                                                        ?.internCode ||
                                                        request.internCode ||
                                                        "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Email
                                                </strong>

                                                <span>
                                                    {request.userId
                                                        ?.email ||
                                                        "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Certificate Type
                                                </strong>

                                                <span
                                                    style={
                                                        styles.certificateType
                                                    }
                                                >
                                                    {request.certificateType ||
                                                        "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Company
                                                </strong>

                                                <span>
                                                    {request.internshipId
                                                        ?.companyName ||
                                                        "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Domain
                                                </strong>

                                                <span>
                                                    {request.internshipId
                                                        ?.domain ||
                                                        "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Internship Start
                                                </strong>

                                                <span>
                                                    {request.internshipId
                                                        ?.startDate
                                                        ? new Date(
                                                            request
                                                                .internshipId
                                                                .startDate
                                                        ).toLocaleDateString()
                                                        : "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Internship End
                                                </strong>

                                                <span>
                                                    {request.internshipId
                                                        ?.endDate
                                                        ? new Date(
                                                            request
                                                                .internshipId
                                                                .endDate
                                                        ).toLocaleDateString()
                                                        : "N/A"}
                                                </span>
                                            </div>


                                            <div
                                                style={
                                                    styles.detailRow
                                                }
                                            >
                                                <strong>
                                                    Requested On
                                                </strong>

                                                <span>
                                                    {request.requestedAt
                                                        ? new Date(
                                                            request.requestedAt
                                                        ).toLocaleDateString()
                                                        : request.createdAt
                                                            ? new Date(
                                                                request.createdAt
                                                            ).toLocaleDateString()
                                                            : "N/A"}
                                                </span>
                                            </div>

                                        </div>


                                        {/* REASON */}
                                        {request.reason && (
                                            <div
                                                style={
                                                    styles.reasonBox
                                                }
                                            >
                                                <strong>
                                                    Intern's Reason
                                                </strong>

                                                <p>
                                                    {request.reason}
                                                </p>
                                            </div>
                                        )}


                                        {/* ACTIONS */}
                                        <div
                                            style={
                                                styles.actions
                                            }
                                        >

                                            <button
                                                onClick={() =>
                                                    handleReject(
                                                        request._id
                                                    )
                                                }
                                                disabled={
                                                    isProcessing
                                                }
                                                style={
                                                    styles.rejectButton
                                                }
                                            >
                                                {isProcessing
                                                    ? "Processing..."
                                                    : "Reject"}
                                            </button>


                                            <button
                                                onClick={() =>
                                                    handleApprove(
                                                        request._id
                                                    )
                                                }
                                                disabled={
                                                    isProcessing
                                                }
                                                style={
                                                    styles.approveButton
                                                }
                                            >
                                                {isProcessing
                                                    ? "Processing..."
                                                    : "Approve"}
                                            </button>

                                        </div>

                                    </div>
                                );
                            })}

                        </div>
                    )}

                </section>
            )}

        </div>
    );
};


/* =========================================================
   STYLES
   ========================================================= */

const styles = {

    container: {
        padding: "30px",
        fontFamily: "Arial, sans-serif",
        minHeight: "100vh",
        boxSizing: "border-box"
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        marginBottom: "30px",
        flexWrap: "wrap"
    },

    title: {
        margin: 0,
        fontSize: "32px"
    },

    subtitle: {
        marginTop: "8px",
        color: "#666",
        fontSize: "16px"
    },

    loadButton: {
        padding: "12px 18px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "15px",
        background: "#2563eb",
        color: "white"
    },

    section: {
        marginTop: "25px"
    },

    sectionHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "20px"
    },

    sectionTitle: {
        margin: 0,
        fontSize: "24px"
    },

    count: {
        padding: "6px 12px",
        borderRadius: "20px",
        background: "#f3f4f6",
        color: "#374151",
        fontSize: "14px"
    },

    success: {
        padding: "12px 15px",
        marginBottom: "20px",
        borderRadius: "6px",
        background: "#dcfce7",
        color: "#166534",
        border: "1px solid #bbf7d0"
    },

    error: {
        padding: "12px 15px",
        marginBottom: "20px",
        borderRadius: "6px",
        background: "#fee2e2",
        color: "#991b1b",
        border: "1px solid #fecaca"
    },

    empty: {
        padding: "40px",
        textAlign: "center",
        border: "1px solid #ddd",
        borderRadius: "10px",
        background: "#fafafa"
    },

    list: {
        display: "flex",
        flexDirection: "column",
        gap: "20px"
    },

    card: {
        padding: "24px",
        border: "1px solid #ddd",
        borderRadius: "10px",
        background: "white",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)"
    },

    cardHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: "15px",
        marginBottom: "20px"
    },

    cardTitle: {
        margin: 0,
        fontSize: "20px"
    },

    requestNumber: {
        marginTop: "6px",
        color: "#666",
        fontSize: "14px"
    },

    pendingBadge: {
        padding: "6px 12px",
        borderRadius: "20px",
        background: "#fef3c7",
        color: "#92400e",
        fontSize: "13px",
        fontWeight: "600"
    },

    details: {
        borderTop: "1px solid #eee",
        borderBottom: "1px solid #eee"
    },

    detailRow: {
        display: "flex",
        justifyContent: "space-between",
        gap: "20px",
        padding: "12px 0",
        borderBottom: "1px solid #f0f0f0"
    },

    certificateType: {
        textTransform: "capitalize",
        fontWeight: "600"
    },

    reasonBox: {
        marginTop: "20px",
        padding: "15px",
        background: "#f8fafc",
        borderRadius: "8px"
    },

    actions: {
        display: "flex",
        justifyContent: "flex-end",
        gap: "12px",
        marginTop: "20px"
    },

    approveButton: {
        padding: "11px 20px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        background: "#16a34a",
        color: "white",
        fontSize: "15px",
        fontWeight: "600"
    },

    rejectButton: {
        padding: "11px 20px",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        background: "#dc2626",
        color: "white",
        fontSize: "15px",
        fontWeight: "600"
    }
};


export default HRDashboard;