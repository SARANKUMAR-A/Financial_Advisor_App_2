import React, { useState, useMemo } from "react";
import {
    FiSearch,
    FiSliders,
    FiArrowUp,
    FiArrowDown,
    FiChevronUp,
    FiChevronDown,
    FiCheckCircle
} from "react-icons/fi";
import "./FinancialData.css";

const INITIAL_FINANCIAL_ITEMS = [
    {
        id: 1,
        name: "ICICI Bank",
        type: "Bank Account",
        categoryType: "Assets",
        value: "₹8,42,500",
        rawValue: 842500,
        date: "Sep 06, 2026",
        rawDate: "2026-09-06",
        status: "Active"
    },
    {
        id: 2,
        name: "HDFC Mutual Fund",
        type: "Investment",
        categoryType: "Investments",
        value: "₹6,25,000",
        rawValue: 625000,
        date: "Sep 05, 2026",
        rawDate: "2026-09-05",
        status: "Active"
    },
    {
        id: 3,
        name: "LIC Policy",
        type: "Insurance",
        categoryType: "Investments",
        value: "₹4,80,000",
        rawValue: 480000,
        date: "Sep 02, 2026",
        rawDate: "2026-09-02",
        status: "Active"
    },
    {
        id: 4,
        name: "Property - Chennai",
        type: "Real Estate",
        categoryType: "Assets",
        value: "₹18,50,000",
        rawValue: 1850000,
        date: "Aug 28, 2026",
        rawDate: "2026-08-28",
        status: "Active"
    },
    {
        id: 5,
        name: "SBI Home Loan",
        type: "Home Loan",
        categoryType: "Liabilities",
        value: "₹24,50,000",
        rawValue: 2450000,
        date: "Aug 15, 2026",
        rawDate: "2026-08-15",
        status: "Active"
    }
];

function FinancialData() {
    const [items] = useState(INITIAL_FINANCIAL_ITEMS);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("All Types");
    const [sortBy, setSortBy] = useState("date");
    const [sortDir, setSortDir] = useState("desc");

    // Filter & Sort
    const processedItems = useMemo(() => {
        const filtered = items.filter(item => {
            const matchesSearch = search.trim() === "" ||
                item.name.toLowerCase().includes(search.toLowerCase().trim()) ||
                item.type.toLowerCase().includes(search.toLowerCase().trim());

            const matchesType = typeFilter === "All Types" ||
                item.categoryType === typeFilter ||
                item.type === typeFilter;

            return matchesSearch && matchesType;
        });

        return [...filtered].sort((a, b) => {
            let cmp = 0;
            if (sortBy === "name") {
                cmp = a.name.localeCompare(b.name);
            } else if (sortBy === "type") {
                cmp = a.type.localeCompare(b.type);
            } else if (sortBy === "value") {
                cmp = a.rawValue - b.rawValue;
            } else if (sortBy === "date") {
                cmp = new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime();
            } else if (sortBy === "status") {
                cmp = a.status.localeCompare(b.status);
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [items, search, typeFilter, sortBy, sortDir]);

    // Sorting handlers
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortDir(field === "value" || field === "date" ? "desc" : "asc");
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
        <div className="page-background financial-data-page">

            <div className="page-header">
                <div>
                    <span className="dashboard-eyebrow">DATA MANAGEMENT</span>
                    <h1>Financial Data</h1>
                    <p>
                        Manage and organize your portfolio assets, liabilities, and investments.
                    </p>
                </div>

                <button className="primary-button">
                    + Add Data
                </button>
            </div>

            <div className="toolbar financial-toolbar">
                <div className="search-container">
                    <FiSearch className="search-icon" />
                    <input
                        placeholder="Search financial data..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="All Types">All Types</option>
                    <option value="Assets">Assets</option>
                    <option value="Liabilities">Liabilities</option>
                    <option value="Investments">Investments</option>
                </select>

                {/* SORT BY DROPDOWN */}
                <div className="financial-sort-container">
                    <label htmlFor="financial-sort-select" className="financial-sort-label">
                        <FiSliders /> Sort:
                    </label>
                    <select
                        id="financial-sort-select"
                        className="financial-sort-select"
                        value={`${sortBy}:${sortDir}`}
                        onChange={handleSortDropdownChange}
                        aria-label="Sort financial data"
                    >
                        <option value="date:desc">Last Updated (Newest first)</option>
                        <option value="date:asc">Last Updated (Oldest first)</option>
                        <option value="name:asc">Name (A to Z)</option>
                        <option value="name:desc">Name (Z to A)</option>
                        <option value="value:desc">Value (Highest first)</option>
                        <option value="value:asc">Value (Lowest first)</option>
                        <option value="type:asc">Type (A to Z)</option>
                        <option value="type:desc">Type (Z to A)</option>
                    </select>
                </div>

                <button className="export-button">
                    Export
                </button>
            </div>

            <div className="table-card financial-table-card">
                <table className="financial-table">
                    <thead>
                        <tr>
                            <th
                                className={`sortable-th ${sortBy === "name" ? "sorted" : ""}`}
                                onClick={() => handleSort("name")}
                                title="Click to sort by Name"
                            >
                                <div className="th-content">
                                    <span>Name</span>
                                    {renderSortIcon("name")}
                                </div>
                            </th>

                            <th
                                className={`sortable-th ${sortBy === "type" ? "sorted" : ""}`}
                                onClick={() => handleSort("type")}
                                title="Click to sort by Type"
                            >
                                <div className="th-content">
                                    <span>Type</span>
                                    {renderSortIcon("type")}
                                </div>
                            </th>

                            <th
                                className={`sortable-th ${sortBy === "value" ? "sorted" : ""}`}
                                onClick={() => handleSort("value")}
                                title="Click to sort by Value"
                            >
                                <div className="th-content">
                                    <span>Value</span>
                                    {renderSortIcon("value")}
                                </div>
                            </th>

                            <th
                                className={`sortable-th ${sortBy === "date" ? "sorted" : ""}`}
                                onClick={() => handleSort("date")}
                                title="Click to sort by Last Updated"
                            >
                                <div className="th-content">
                                    <span>Last Updated</span>
                                    {renderSortIcon("date")}
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
                        </tr>
                    </thead>

                    <tbody>
                        {processedItems.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: "center", padding: "30px" }}>
                                    No financial records found matching your filters.
                                </td>
                            </tr>
                        ) : (
                            processedItems.map((item) => (
                                <tr key={item.id}>
                                    <td>
                                        <strong>{item.name}</strong>
                                    </td>
                                    <td>
                                        <span className="financial-type-badge">{item.type}</span>
                                    </td>
                                    <td className="financial-value">
                                        {item.value}
                                    </td>
                                    <td>{item.date}</td>
                                    <td>
                                        <span className="financial-status-badge">
                                            <FiCheckCircle /> {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}

export default FinancialData;