import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    FiFileText,
    FiX,
    FiFilter,
    FiSearch,
    FiCheckCircle,
    FiArrowUp,
    FiArrowDown,
    FiChevronUp,
    FiChevronDown,
    FiSliders
} from "react-icons/fi";

import {
    getTransactions,
} from "../services/api";

import "./Transactions.css";


function Transactions() {

    // ============================================================
    // SEARCH PARAMS & STATE
    // ============================================================

    const [searchParams, setSearchParams] = useSearchParams();
    const statementId = searchParams.get("statement_id") || "";

    const [transactions, setTransactions] = useState([]);
    const [activeStatement, setActiveStatement] = useState(null);
    const [isAllStatements, setIsAllStatements] = useState(
        String(statementId).toLowerCase() === "all"
    );

    const [availableCategories, setAvailableCategories] = useState([]);
    const [availableMonths, setAvailableMonths] = useState([]);

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");

    const [category, setCategory] = useState(
        "All Categories"
    );

    const [month, setMonth] = useState(
        "All Months"
    );

    const [transactionType, setTransactionType] = useState(
        "All Types"
    );

    const [sortBy, setSortBy] = useState("date");
    const [sortDir, setSortDir] = useState("desc");

    const [page, setPage] = useState(1);

    const [totalCount, setTotalCount] = useState(0);

    const pageSize = 50;

    // Reset scroll to top on mount or when statementId or page changes
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: "instant",
        });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        const mainContent = document.querySelector(".main-content");
        if (mainContent) {
            mainContent.scrollTop = 0;
        }
    }, [statementId, page]);


    // ============================================================
    // FETCH TRANSACTIONS
    // ============================================================

    const fetchTransactions = async () => {

        try {

            setLoading(true);

            setError("");


            const data = await getTransactions({

                statementId: statementId,

                search: search.trim(),

                category:
                    category === "All Categories"
                        ? ""
                        : category,

                type:
                    transactionType === "All Types"
                        ? ""
                        : transactionType,

                sortBy: sortBy,

                sortDir: sortDir,

                page: page,

                pageSize: pageSize,

            });



            /*
             * Django response:
             *
             * {
             *     count: 100,
             *     next: "...",
             *     previous: null,
             *     results: {
             *         success: true,
             *         results: [...]
             *     }
             * }
             */


            const transactionData =
                data?.results?.results || [];

            const statementMeta =
                data?.results?.statement || null;

            const isAll =
                data?.results?.is_all_statements ??
                (String(statementId).toLowerCase() === "all");

            setTransactions(
                transactionData
            );

            setActiveStatement(
                statementMeta ||
                (statementId && String(statementId).toLowerCase() !== "all"
                    ? { id: statementId }
                    : null)
            );

            setIsAllStatements(
                isAll
            );

            const catList =
                data?.results?.categories || [];

            const monthList =
                data?.results?.months || [];

            if (catList.length > 0) {
                setAvailableCategories(catList);
            }

            if (monthList.length > 0) {
                setAvailableMonths(monthList);
            }

            setTotalCount(
                data?.count || 0
            );


        } catch (err) {

            console.error(
                "Failed to fetch transactions:",
                err
            );


            setTransactions([]);


            setError(
                err?.response?.data?.message ||
                "Unable to load transactions."
            );


        } finally {

            setLoading(false);

        }

    };


    // ============================================================
    // LOAD DATA
    // ============================================================

    useEffect(() => {

        fetchTransactions();

    }, [
        page,
        category,
        transactionType,
        statementId,
        sortBy,
        sortDir,
    ]);


    // ============================================================
    // CATEGORIES (Maintains full list even when filtered)
    // ============================================================

    const categories = useMemo(() => {

        const catSet = new Set(availableCategories);

        transactions.forEach(transaction => {
            if (transaction.category) {
                catSet.add(transaction.category);
            }
        });

        if (category && category !== "All Categories") {
            catSet.add(category);
        }

        return Array.from(catSet).sort();

    }, [
        availableCategories,
        transactions,
        category,
    ]);


    // ============================================================
    // MONTHS (Maintains full list even when filtered)
    // ============================================================

    const months = useMemo(() => {

        const monthSet = new Set(availableMonths);

        transactions.forEach(transaction => {
            if (transaction.transaction_date) {
                monthSet.add(transaction.transaction_date.substring(0, 7));
            }
        });

        if (month && month !== "All Months") {
            monthSet.add(month);
        }

        return Array.from(monthSet).sort().reverse();

    }, [
        availableMonths,
        transactions,
        month,
    ]);


    // ============================================================
    // MONTH FILTER
    // ============================================================

    const filteredTransactions =
        useMemo(() => {

            if (
                month === "All Months"
            ) {

                return transactions;

            }


            return transactions.filter(
                transaction => {

                    if (
                        !transaction.transaction_date
                    ) {
                        return false;
                    }


                    return transaction
                        .transaction_date
                        .startsWith(month);

                }
            );

        }, [
            transactions,
            month,
        ]);


    // ============================================================
    // FORMAT MONTH
    // ============================================================

    const formatMonth = (
        monthValue
    ) => {

        if (!monthValue) {

            return "";

        }


        const date =
            new Date(
                `${monthValue}-01`
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return monthValue;

        }


        return date.toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric",
            }
        );

    };


    // ============================================================
    // FORMAT DATE
    // ============================================================

    const formatDate = (
        dateValue
    ) => {

        if (!dateValue) {

            return "-";

        }


        const date =
            new Date(
                dateValue
            );


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return dateValue;

        }


        return date.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "2-digit",
                year: "numeric",
            }
        );

    };


    // ============================================================
    // FORMAT AMOUNT
    // ============================================================

    const formatAmount = (
        amount
    ) => {

        const value =
            Number(amount);


        if (
            Number.isNaN(value)
        ) {

            return "₹0.00";

        }


        const formatted =
            Math.abs(value).toLocaleString(
                "en-IN",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                }
            );


        if (value < 0) {

            return `-₹${formatted}`;

        }


        return `₹${formatted}`;

    };


    // ============================================================
    // HANDLE SEARCH
    // ============================================================

    const handleSearch = () => {

        setPage(1);

        fetchTransactions();

    };


    // ============================================================
    // HANDLE CATEGORY
    // ============================================================

    const handleCategoryChange = (
        event
    ) => {

        setCategory(
            event.target.value
        );

        setPage(1);

    };


    // ============================================================
    // HANDLE TYPE
    // ============================================================

    const handleTypeChange = (
        event
    ) => {

        setTransactionType(
            event.target.value
        );

        setPage(1);

    };


    // ============================================================
    // HANDLE MONTH
    // ============================================================

    const handleMonthChange = (
        event
    ) => {

        setMonth(
            event.target.value
        );

        setPage(1);

    };


    // ============================================================
    // SORTING HANDLERS
    // ============================================================

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(prev => (prev === "asc" ? "desc" : "asc"));
        } else {
            setSortBy(field);
            setSortDir(field === "amount" || field === "date" ? "desc" : "asc");
        }
        setPage(1);
    };

    const handleSortDropdownChange = (event) => {
        const value = event.target.value;
        const [field, dir] = value.split(":");
        setSortBy(field);
        setSortDir(dir);
        setPage(1);
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


    // ============================================================
    // PAGINATION
    // ============================================================

    const totalPages =
        Math.ceil(
            totalCount / pageSize
        );


    const handlePreviousPage = () => {

        if (page > 1) {

            setPage(
                previous =>
                    previous - 1
            );

        }

    };


    const handleNextPage = () => {

        if (
            page < totalPages
        ) {

            setPage(
                previous =>
                    previous + 1
            );

        }

    };


    // ============================================================
    // LOADING
    // ============================================================

    if (loading) {

        return (

            <div className="page-background">

                <div className="page-header">

                    <div>

                        <span className="dashboard-eyebrow">
                            ACTIVITY
                        </span>

                        <h1>
                            Transactions
                        </h1>

                        <p>
                            Loading transactions...
                        </p>

                    </div>

                </div>


                <div className="table-card">

                    <div
                        style={{
                            padding: "40px",
                            textAlign: "center",
                        }}
                    >
                        Loading...
                    </div>

                </div>

            </div>

        );

    }


    // ============================================================
    // UI
    // ============================================================

    return (

        <div className="page-background transactions-page">


            {/* ==================================================
                PAGE HEADER
            ================================================== */}

            <div className="page-header">

                <div>

                    <span className="dashboard-eyebrow">
                        ACTIVITY
                    </span>

                    <h1>
                        Transactions
                    </h1>

                    <p>
                        Track and review all transactions across your statements.
                    </p>

                </div>

            </div>


            {/* ==================================================
                ERROR MESSAGE
            ================================================== */}

            {error && (

                <div
                    className="error-message"
                    style={{
                        marginBottom: "20px",
                    }}
                >

                    {error}

                </div>

            )}


            {/* ==================================================
                STATEMENT FILTER BANNER
            ================================================== */}

            {isAllStatements ? (
                <div className="tx-statement-banner tx-all-statements-banner">
                    <div className="tx-statement-banner-left">
                        <FiFileText />
                        <span>
                            Showing transactions across <strong>All Statements</strong>
                        </span>
                    </div>
                    <div className="tx-statement-banner-actions">
                        <Link
                            to="/dashboard"
                            className="tx-banner-link"
                        >
                            View Dashboard
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                const nextParams = new URLSearchParams(searchParams);
                                nextParams.delete("statement_id");
                                setSearchParams(nextParams);
                                setPage(1);
                            }}
                            className="tx-banner-btn"
                        >
                            Show Latest Statement
                        </button>
                    </div>
                </div>
            ) : activeStatement ? (
                <div className="tx-statement-banner">
                    <div className="tx-statement-banner-left">
                        <FiFileText />
                        <span>
                            Filtered by Statement <strong>#{activeStatement.id}</strong>
                            {activeStatement.file_name && (
                                <span className="tx-statement-filename">
                                    {" "}({activeStatement.file_name})
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="tx-statement-banner-actions">
                        <Link
                            to={`/dashboard?statement_id=${activeStatement.id}`}
                            className="tx-banner-link"
                        >
                            View Dashboard
                        </Link>
                        <button
                            type="button"
                            onClick={() => {
                                const nextParams = new URLSearchParams(searchParams);
                                nextParams.set("statement_id", "all");
                                setSearchParams(nextParams);
                                setPage(1);
                            }}
                            className="tx-banner-btn"
                        >
                            <FiX /> Show All Statements
                        </button>
                    </div>
                </div>
            ) : null}


            {/* ==================================================
                TOOLBAR
            ================================================== */}

            <div className="toolbar transactions-toolbar">


                {/* SEARCH */}

                <div className="search-container">
                    <FiSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search transactions..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        onKeyDown={(event) => {

                            if (
                                event.key === "Enter"
                            ) {

                                handleSearch();

                            }

                        }}
                    />
                </div>


                {/* CATEGORY */}

                <select
                    value={category}
                    onChange={
                        handleCategoryChange
                    }
                >

                    <option value="All Categories">
                        All Categories
                    </option>


                    {categories.map(
                        item => (

                            <option
                                key={item}
                                value={item}
                            >
                                {item}
                            </option>

                        )
                    )}

                </select>


                {/* MONTH */}

                <select
                    value={month}
                    onChange={
                        handleMonthChange
                    }
                >

                    <option value="All Months">
                        All Months
                    </option>


                    {months.map(
                        item => (

                            <option
                                key={item}
                                value={item}
                            >
                                {formatMonth(
                                    item
                                )}
                            </option>

                        )
                    )}

                </select>


                {/* TYPE */}

                <select
                    value={transactionType}
                    onChange={
                        handleTypeChange
                    }
                >

                    <option value="All Types">
                        All Types
                    </option>

                    <option value="income">
                        Income
                    </option>

                    <option value="expense">
                        Expense
                    </option>

                </select>


                {/* SORT BY */}

                <div className="tx-sort-container">
                    <label htmlFor="tx-sort-select" className="tx-sort-label">
                        <FiSliders /> Sort:
                    </label>
                    <select
                        id="tx-sort-select"
                        className="tx-sort-select"
                        value={`${sortBy}:${sortDir}`}
                        onChange={handleSortDropdownChange}
                        aria-label="Sort transactions"
                    >
                        <option value="date:desc">Date (Newest first)</option>
                        <option value="date:asc">Date (Oldest first)</option>
                        <option value="amount:desc">Amount (Highest first)</option>
                        <option value="amount:asc">Amount (Lowest first)</option>
                        <option value="description:asc">Description (A to Z)</option>
                        <option value="description:desc">Description (Z to A)</option>
                        <option value="category:asc">Category (A to Z)</option>
                        <option value="category:desc">Category (Z to A)</option>
                    </select>
                </div>


            </div>


            {/* ==================================================
                TRANSACTION TABLE
            ================================================== */}

            <div className="table-card transactions-table-card">

                <table className="transactions-table">

                    <thead>

                        <tr>

                            <th
                                className={`sortable-th ${sortBy === "description" ? "sorted" : ""}`}
                                onClick={() => handleSort("description")}
                                title="Click to sort by Description"
                            >
                                <div className="th-content">
                                    <span>Description</span>
                                    {renderSortIcon("description")}
                                </div>
                            </th>

                            <th
                                className={`sortable-th ${sortBy === "category" ? "sorted" : ""}`}
                                onClick={() => handleSort("category")}
                                title="Click to sort by Category"
                            >
                                <div className="th-content">
                                    <span>Category</span>
                                    {renderSortIcon("category")}
                                </div>
                            </th>

                            <th
                                className={`sortable-th ${sortBy === "amount" ? "sorted" : ""}`}
                                onClick={() => handleSort("amount")}
                                title="Click to sort by Amount"
                            >
                                <div className="th-content">
                                    <span>Amount</span>
                                    {renderSortIcon("amount")}
                                </div>
                            </th>

                            <th
                                className={`sortable-th ${sortBy === "date" ? "sorted" : ""}`}
                                onClick={() => handleSort("date")}
                                title="Click to sort by Date"
                            >
                                <div className="th-content">
                                    <span>Date</span>
                                    {renderSortIcon("date")}
                                </div>
                            </th>

                            <th>
                                Status
                            </th>

                        </tr>

                    </thead>


                    <tbody>


                        {filteredTransactions.length === 0 ? (

                            <tr>

                                <td
                                    colSpan="5"
                                    style={{
                                        textAlign:
                                            "center",
                                        padding:
                                            "40px",
                                    }}
                                >

                                    No transactions found.

                                </td>

                            </tr>

                        ) : (

                            filteredTransactions.map(
                                transaction => {

                                    const amount =
                                        Number(
                                            transaction.amount
                                        );


                                    return (

                                        <tr
                                            key={
                                                transaction.id
                                            }
                                        >


                                            {/* DESCRIPTION */}

                                            <td>

                                                <strong>

                                                    {
                                                        transaction.description ||
                                                        transaction.merchant ||
                                                        "Unknown Transaction"
                                                    }

                                                </strong>

                                            </td>


                                            {/* CATEGORY */}

                                            <td>

                                                <span className="tx-category-badge">
                                                    {
                                                        transaction.category ||
                                                        "Uncategorized"
                                                    }
                                                </span>

                                            </td>


                                            {/* AMOUNT */}

                                            <td
                                                className={`tx-amount ${
                                                    amount < 0
                                                        ? "negative"
                                                        : "positive"
                                                }`}
                                            >

                                                {
                                                    formatAmount(
                                                        transaction.amount
                                                    )
                                                }

                                            </td>


                                            {/* DATE */}

                                            <td>

                                                {
                                                    formatDate(
                                                        transaction.transaction_date
                                                    )
                                                }

                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <span
                                                    className="tx-status-badge"
                                                >
                                                    <FiCheckCircle /> Completed
                                                </span>

                                            </td>


                                        </tr>

                                    );

                                }

                            )

                        )}


                    </tbody>

                </table>


                {/* ==================================================
                    PAGINATION
                ================================================== */}

                {totalCount > 0 && (

                    <div className="transactions-pagination">

                        <span>

                            Showing{" "}

                            {Math.min(
                                (
                                    page - 1
                                ) * pageSize + 1,
                                totalCount
                            )}

                            {" - "}

                            {Math.min(
                                page * pageSize,
                                totalCount
                            )}

                            {" of "}

                            {totalCount} transactions

                        </span>


                        <div className="pagination-controls">

                            <button
                                type="button"
                                className="pagination-btn"
                                disabled={
                                    page === 1
                                }
                                onClick={
                                    handlePreviousPage
                                }
                            >
                                Previous
                            </button>


                            <span className="pagination-current">
                                Page {page} of {totalPages}
                            </span>


                            <button
                                type="button"
                                className="pagination-btn"
                                disabled={
                                    page >= totalPages
                                }
                                onClick={
                                    handleNextPage
                                }
                            >
                                Next
                            </button>

                        </div>


                    </div>

                )}

            </div>


        </div>

    );

}


export default Transactions;