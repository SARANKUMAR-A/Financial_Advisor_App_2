import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
    FiFileText,
    FiCalendar,
    FiCheckCircle,
    FiClock,
    FiAlertCircle,
    FiArrowRight,
    FiSearch,
    FiExternalLink,
    FiBarChart2,
    FiList,
    FiUpload,
    FiRefreshCw,
    FiArrowUp,
    FiArrowDown,
    FiChevronUp,
    FiChevronDown,
    FiSliders
} from "react-icons/fi";
import { getStatements } from "../services/api";
import "./HistoryData.css";

function HistoryData() {
    const navigate = useNavigate();

    const [statements, setStatements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [sortBy, setSortBy] = useState("uploaded_at");
    const [sortDir, setSortDir] = useState("desc");

    const fetchStatements = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getStatements();
            // Expected { success: true, count: N, statements: [...] }
            const list = data?.statements || [];
            setStatements(list);
        } catch (err) {
            console.error("Failed to fetch statement history:", err);
            setError(err?.message || "Failed to load statement history.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatements();
    }, []);

    const filteredStatements = useMemo(() => {
        const filtered = statements.filter(stmt => {
            const matchesSearch = search.trim() === "" ||
                stmt.file_name?.toLowerCase().includes(search.toLowerCase().trim()) ||
                String(stmt.id).includes(search.trim());

            const matchesStatus = statusFilter === "ALL" || stmt.status === statusFilter;

            return matchesSearch && matchesStatus;
        });

        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "file_name") {
                cmp = (a.file_name || "").localeCompare(b.file_name || "");
            } else if (sortBy === "uploaded_at") {
                const timeA = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
                const timeB = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
                cmp = timeA - timeB;
            } else if (sortBy === "period") {
                const fromA = a.statement_from ? new Date(a.statement_from).getTime() : 0;
                const fromB = b.statement_from ? new Date(b.statement_from).getTime() : 0;
                cmp = fromA - fromB;
            } else if (sortBy === "total_transactions") {
                cmp = (Number(a.total_transactions) || 0) - (Number(b.total_transactions) || 0);
            } else if (sortBy === "status") {
                cmp = (a.status || "").localeCompare(b.status || "");
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [statements, search, statusFilter, sortBy, sortDir]);

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        try {
            return new Date(dateString).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric"
            });
        } catch {
            return dateString;
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return "—";
        try {
            return new Date(dateString).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch {
            return dateString;
        }
    };

    const renderStatusBadge = (status) => {
        switch (status) {
            case "COMPLETED":
                return (
                    <span className="history-status-badge completed">
                        <FiCheckCircle /> Completed
                    </span>
                );
            case "PROCESSING":
                return (
                    <span className="history-status-badge processing">
                        <FiClock /> Processing
                    </span>
                );
            case "FAILED":
                return (
                    <span className="history-status-badge failed">
                        <FiAlertCircle /> Failed
                    </span>
                );
            default:
                return (
                    <span className="history-status-badge default">
                        {status}
                    </span>
                );
        }
    };

    // Sorting handlers
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortDir(field === "uploaded_at" || field === "period" || field === "total_transactions" ? "desc" : "asc");
        }
    };

    const handleSortDropdownChange = (e) => {
        const [field, dir] = e.target.value.split(":");
        setSortBy(field);
        setSortDir(dir);
    };

    const renderSortIcon = (field) => {
        if (sortBy !== field) {
            return (
                <span className="sort-indicator inactive" aria-label="Not sorted">
                    <FiChevronUp className="icon-up" />
                    <FiChevronDown className="icon-down" />
                </span>
            );
        }
        return (
            <span className="sort-indicator active" aria-label={`Sorted ${sortDir === "asc" ? "Ascending" : "Descending"}`}>
                {sortDir === "asc" ? <FiArrowUp /> : <FiArrowDown />}
            </span>
        );
    };

    return (
        <div className="page-background history-data-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <span className="dashboard-eyebrow">
                        STATEMENTS ARCHIVE
                    </span>
                    <h1>History Data</h1>
                    <p>
                        Browse all uploaded bank statement files and view statement-specific analytics or transactions.
                    </p>
                </div>
                <div className="history-header-actions">
                    <button
                        className="btn-refresh"
                        onClick={fetchStatements}
                        title="Refresh statement list"
                    >
                        <FiRefreshCw className={loading ? "spin" : ""} /> Refresh
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="error-message" style={{ marginBottom: "20px" }}>
                    <FiAlertCircle /> {error}
                </div>
            )}

            {/* Toolbar */}
            <div className="toolbar history-toolbar">
                <div className="search-box">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search by file name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="status-select"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="FAILED">Failed</option>
                </select>

                {/* SORT BY DROPDOWN */}
                <div className="history-sort-container">
                    <label htmlFor="history-sort-select" className="history-sort-label">
                        <FiSliders /> Sort:
                    </label>
                    <select
                        id="history-sort-select"
                        className="history-sort-select"
                        value={`${sortBy}:${sortDir}`}
                        onChange={handleSortDropdownChange}
                        aria-label="Sort statements"
                    >
                        <option value="uploaded_at:desc">Upload Date (Newest first)</option>
                        <option value="uploaded_at:asc">Upload Date (Oldest first)</option>
                        <option value="file_name:asc">File Name (A to Z)</option>
                        <option value="file_name:desc">File Name (Z to A)</option>
                        <option value="total_transactions:desc">Transactions (Highest first)</option>
                        <option value="total_transactions:asc">Transactions (Lowest first)</option>
                        <option value="period:desc">Statement Period (Recent first)</option>
                        <option value="period:asc">Statement Period (Oldest first)</option>
                        <option value="status:asc">Status (A to Z)</option>
                        <option value="status:desc">Status (Z to A)</option>
                    </select>
                </div>

                <div className="history-count-pill">
                    {filteredStatements.length} {filteredStatements.length === 1 ? "File" : "Files"}
                </div>
            </div>

            {/* Table Card */}
            <div className="table-card history-table-card">
                {loading ? (
                    <div className="history-loading-state">
                        <div className="history-spinner"></div>
                        <p>Loading statement history...</p>
                    </div>
                ) : filteredStatements.length === 0 ? (
                    <div className="history-empty-state">
                        <div className="empty-icon-circle">
                            <FiFileText />
                        </div>
                        <h3>No Statements Found</h3>
                        <p>
                            {search || statusFilter !== "ALL"
                                ? "No uploaded statements match your current search or filter."
                                : "You haven't uploaded any bank statements yet. Upload a statement on the Dashboard to get started."}
                        </p>
                        <button
                            className="primary-button"
                            onClick={() => navigate("/dashboard")}
                            style={{ marginTop: "16px" }}
                        >
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th
                                        className={`sortable-th ${sortBy === "file_name" ? "sorted" : ""}`}
                                        onClick={() => handleSort("file_name")}
                                        title="Click to sort by Statement File"
                                    >
                                        <div className="th-content">
                                            <span>Statement File</span>
                                            {renderSortIcon("file_name")}
                                        </div>
                                    </th>

                                    <th
                                        className={`sortable-th ${sortBy === "uploaded_at" ? "sorted" : ""}`}
                                        onClick={() => handleSort("uploaded_at")}
                                        title="Click to sort by Upload Date"
                                    >
                                        <div className="th-content">
                                            <span>Upload Date</span>
                                            {renderSortIcon("uploaded_at")}
                                        </div>
                                    </th>

                                    <th
                                        className={`sortable-th ${sortBy === "period" ? "sorted" : ""}`}
                                        onClick={() => handleSort("period")}
                                        title="Click to sort by Statement Period"
                                    >
                                        <div className="th-content">
                                            <span>Statement Period</span>
                                            {renderSortIcon("period")}
                                        </div>
                                    </th>

                                    <th
                                        className={`sortable-th ${sortBy === "total_transactions" ? "sorted" : ""}`}
                                        onClick={() => handleSort("total_transactions")}
                                        title="Click to sort by Transaction Count"
                                    >
                                        <div className="th-content">
                                            <span>Transactions</span>
                                            {renderSortIcon("total_transactions")}
                                        </div>
                                    </th>

                                    <th
                                        className={`sortable-th ${sortBy === "status" ? "sorted" : ""}`}
                                        onClick={() => handleSort("status")}
                                        title="Click to sort by Status"
                                    >
                                        <div className="th-content">
                                            <span>Status</span>
                                            {renderSortIcon("status")}
                                        </div>
                                    </th>

                                    <th style={{ textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStatements.map((stmt) => {
                                    const isCompleted = stmt.status === "COMPLETED";

                                    return (
                                        <tr key={stmt.id} className="history-table-row">
                                            {/* File Name */}
                                            <td>
                                                <div className="history-file-cell">
                                                    <div className="history-file-icon">
                                                        <FiFileText />
                                                    </div>
                                                    <div className="history-file-info">
                                                        <span
                                                            className="history-file-name"
                                                            title={stmt.file_name}
                                                            onClick={() => isCompleted && navigate(`/dashboard?statement_id=${stmt.id}`)}
                                                            style={{ cursor: isCompleted ? "pointer" : "default" }}
                                                        >
                                                            {stmt.file_name}
                                                        </span>
                                                        <span className="history-file-id">ID: #{stmt.id}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Upload Date */}
                                            <td>
                                                <div className="history-date-cell">
                                                    <span>{formatDateTime(stmt.uploaded_at)}</span>
                                                </div>
                                            </td>

                                            {/* Period */}
                                            <td>
                                                {stmt.statement_from || stmt.statement_to ? (
                                                    <div className="history-period-cell">
                                                        <FiCalendar />
                                                        <span>
                                                            {formatDate(stmt.statement_from)} – {formatDate(stmt.statement_to)}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">Not specified</span>
                                                )}
                                            </td>

                                            {/* Total Transactions */}
                                            <td>
                                                <span className="history-tx-badge">
                                                    {stmt.total_transactions ?? 0} txns
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td>
                                                {renderStatusBadge(stmt.status)}
                                                {stmt.error_message && (
                                                    <div className="history-error-hint" title={stmt.error_message}>
                                                        {stmt.error_message}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td style={{ textAlign: "right" }}>
                                                {isCompleted ? (
                                                    <div className="history-actions-group">
                                                        <Link
                                                            to={`/dashboard?statement_id=${stmt.id}`}
                                                            className="action-btn dashboard-btn"
                                                            title="View Dashboard for this statement"
                                                        >
                                                            <FiBarChart2 /> Dashboard
                                                        </Link>
                                                        <Link
                                                            to={`/transactions?statement_id=${stmt.id}`}
                                                            className="action-btn tx-btn"
                                                            title="View Transactions for this statement"
                                                        >
                                                            <FiList /> Transactions
                                                        </Link>
                                                    </div>
                                                ) : stmt.status === "PROCESSING" ? (
                                                    <span className="text-muted">Processing...</span>
                                                ) : (
                                                    <span className="text-muted">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default HistoryData;
