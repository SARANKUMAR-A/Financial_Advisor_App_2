import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
} from "recharts";

import {
    FiArrowDown,
    FiArrowUp,
    FiCreditCard,
    FiPercent,
    FiUpload,
    FiActivity,
    FiShoppingBag,
    FiHome,
    FiCoffee,
    FiMoreHorizontal,
    FiArrowRight,
    FiTrendingUp,
    FiTrendingDown,
    FiAlertCircle,
    FiCheckCircle,
    FiFileText,
    FiCalendar,
    FiClock,
    FiLock,
    FiCpu,
    FiRefreshCw,
    FiZap,
} from "react-icons/fi";

import {
    getDashboard,
    uploadBankStatement,
    getStatementStatus,
    getInsights,
    generateInsights,
} from "../services/api";

import API from "../api/axios";

import "./Dashboard.css";


/* =========================================================
   CONSTANTS
========================================================= */

const CATEGORY_COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#64748b",
];


/* =========================================================
   HELPERS
========================================================= */

function formatCurrency(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "₹0";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "₹0";
    }

    return `₹${number.toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;
}


function formatCompactCurrency(value) {
    const number = Number(value || 0);

    if (Number.isNaN(number)) {
        return "₹0";
    }

    if (number >= 10000000) {
        return `₹${(number / 10000000).toFixed(1)}Cr`;
    }

    if (number >= 100000) {
        return `₹${(number / 100000).toFixed(1)}L`;
    }

    if (number >= 1000) {
        return `₹${(number / 1000).toFixed(1)}K`;
    }

    return `₹${number.toFixed(0)}`;
}


function getCategoryIcon(category) {
    const name = String(category || "").toLowerCase();

    if (
        name.includes("food") ||
        name.includes("restaurant") ||
        name.includes("dining") ||
        name.includes("meal")
    ) {
        return <FiCoffee />;
    }

    if (
        name.includes("shopping") ||
        name.includes("retail")
    ) {
        return <FiShoppingBag />;
    }

    if (
        name.includes("rent") ||
        name.includes("home") ||
        name.includes("house")
    ) {
        return <FiHome />;
    }

    return <FiMoreHorizontal />;
}


/* =========================================================
   MONTH LABEL HELPER
========================================================= */

function getMonthLabel(item) {
    return (
        item?.month_name ||
        item?.month ||
        item?.month_label ||
        item?.name ||
        item?.label ||
        ""
    );
}


/* =========================================================
   NUMBER HELPER
========================================================= */

function safeNumber(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return 0;
    }

    const number = Number(value);

    return Number.isNaN(number)
        ? 0
        : number;
}


/* =========================================================
   CUSTOM CASH FLOW TOOLTIP
========================================================= */

function CashFlowTooltip({
    active,
    payload,
    label,
}) {
    if (
        !active ||
        !payload ||
        !payload.length
    ) {
        return null;
    }

    return (
        <div className="custom-tooltip">

            <strong>
                {label}
            </strong>

            {payload.map((item) => (
                <div
                    className="tooltip-row"
                    key={item.dataKey}
                >
                    <span>
                        {item.name}
                    </span>

                    <b>
                        {formatCurrency(item.value)}
                    </b>
                </div>
            ))}

        </div>
    );
}


/* =========================================================
   CATEGORY TOOLTIP
========================================================= */

function CategoryTooltip({
    active,
    payload,
}) {
    if (
        !active ||
        !payload ||
        !payload.length
    ) {
        return null;
    }

    const item = payload[0];

    return (
        <div className="custom-tooltip">

            <strong>
                {item.name}
            </strong>

            <p>
                {formatCurrency(item.value)}
            </p>

        </div>
    );
}


/* =========================================================
   MONTHLY EXPENSE TOOLTIP
========================================================= */

function MonthlyExpenseTooltip({
    active,
    payload,
    label,
}) {
    if (
        !active ||
        !payload ||
        !payload.length
    ) {
        return null;
    }

    return (
        <div className="custom-tooltip">

            <strong>
                {label}
            </strong>

            {payload.map((item) => (
                <div
                    className="tooltip-row"
                    key={item.dataKey}
                >
                    <span>
                        {item.name}
                    </span>

                    <b>
                        {formatCurrency(item.value)}
                    </b>
                </div>
            ))}

        </div>
    );
}


/* =========================================================
   GREETING & USER HELPERS
========================================================= */

function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
        return "Good morning";
    }
    if (hour >= 12 && hour < 17) {
        return "Good afternoon";
    }
    return "Good evening";
}

function formatFirstName(name) {
    if (!name || typeof name !== "string") return "";
    const cleanName = name.trim().split(/\s+/)[0];
    if (!cleanName) return "";
    return cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
}

function getStoredFirstName() {
    try {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            if (parsed?.first_name) {
                const formatted = formatFirstName(parsed.first_name);
                if (formatted) return formatted;
            }
            if (parsed?.username) {
                const formatted = formatFirstName(parsed.username);
                if (formatted) return formatted;
            }
        }

        const storedUsername = sessionStorage.getItem("username");
        if (storedUsername) {
            const formatted = formatFirstName(storedUsername);
            if (formatted) return formatted;
        }
    } catch (e) {
        console.error("Error reading stored user name:", e);
    }
    return "";
}


/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {

    /*
     * IMPORTANT:
     * Keep ALL hooks at the top level of the component.
     * Do not put hooks after loading/empty-state returns.
     */

    const [searchParams] = useSearchParams();
    const queryStatementId = searchParams.get("statement_id") || "";

    const [dashboard, setDashboard] = useState(null);

    const [loading, setLoading] = useState(true);

    const [uploading, setUploading] = useState(false);

    const [processingMessage, setProcessingMessage] =
        useState("");

    const [error, setError] = useState("");

    const [generatingInsights, setGeneratingInsights] = useState(false);
    const [insightsOverride, setInsightsOverride] = useState(null);
    const [insightsError, setInsightsError] = useState("");

    const recentCardRef = useRef(null);
    const aiCardRef = useRef(null);
    const aiContentRef = useRef(null);
    const [visibleTxCount, setVisibleTxCount] = useState(6);

    const [greeting, setGreeting] = useState(getGreeting);
    const [firstName, setFirstName] = useState(getStoredFirstName);

    const handleGenerateInsights = async () => {
        try {
            setGeneratingInsights(true);
            setInsightsError("");
            const targetStmtId = queryStatementId || dashboard?.statement?.id || "";
            const res = await generateInsights(targetStmtId);
            if (res && res.success) {
                setInsightsOverride({
                    summary: res.summary,
                    recommendations: res.recommendations,
                    financial_health: res.financial_health,
                    key_takeaways: res.key_takeaways,
                    model_used: res.model_used || "llama3.2 (Local Ollama)",
                    is_local: true,
                });
            } else {
                setInsightsError(res?.message || "Could not generate insights.");
            }
        } catch (err) {
            console.error("Failed to generate AI insights:", err);
            setInsightsError(
                err?.message || "Failed to contact local Ollama model. Ensure Ollama is running (`ollama run llama3.2`)."
            );
        } finally {
            setGeneratingInsights(false);
        }
    };

    useEffect(() => {
        setInsightsOverride(null);
        setInsightsError("");
    }, [queryStatementId]);

    /* =====================================================
       DYNAMIC RECENT TRANSACTIONS COUNT
       Syncs with AI Card height: minimum 6 transactions
    ===================================================== */

    useEffect(() => {
        const updateCount = () => {
            const aiContent = aiContentRef.current || aiCardRef.current;
            const recentCard = recentCardRef.current;
            if (!aiContent || !recentCard) {
                return;
            }

            // In single-column stacked layout (<= 1200px), default to 6
            if (window.innerWidth <= 1200) {
                setVisibleTxCount(6);
                return;
            }

            const header = recentCard.querySelector(".card-heading");
            const headerHeight = header ? header.offsetHeight : 80;

            // Compute available height based on AI card's inner content
            let availableHeight = 0;
            if (aiContentRef.current) {
                availableHeight = aiContentRef.current.offsetHeight - headerHeight;
            } else if (aiCardRef.current) {
                availableHeight = aiCardRef.current.offsetHeight - headerHeight - 48;
            }

            const firstTx = recentCard.querySelector(".transaction");
            const itemHeight = firstTx && firstTx.offsetHeight > 0 ? firstTx.offsetHeight : 72;

            if (availableHeight > 0 && itemHeight > 0) {
                const calculated = Math.floor(availableHeight / itemHeight);
                // Minimum of 6 transactions need to show
                setVisibleTxCount(Math.max(6, calculated));
            } else {
                setVisibleTxCount(6);
            }
        };

        // Run on mount / update and slightly after layout stabilizes
        updateCount();
        const timer1 = setTimeout(updateCount, 100);
        const timer2 = setTimeout(updateCount, 400);

        let resizeObserver = null;
        const targetToObserve = aiContentRef.current || aiCardRef.current;
        if (typeof ResizeObserver !== "undefined" && targetToObserve) {
            resizeObserver = new ResizeObserver(() => {
                updateCount();
            });
            resizeObserver.observe(targetToObserve);
        }

        window.addEventListener("resize", updateCount);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            if (resizeObserver) {
                resizeObserver.disconnect();
            }
            window.removeEventListener("resize", updateCount);
        };
    }, [dashboard, insightsOverride, generatingInsights]);

    useEffect(() => {
        const intervalId = setInterval(() => {
            setGreeting(getGreeting());
        }, 60000);

        let isMounted = true;
        async function fetchUserProfile() {
            try {
                const response = await API.get("profile/");
                if (isMounted && response?.data) {
                    sessionStorage.setItem(
                        "user",
                        JSON.stringify(response.data)
                    );
                    const name = formatFirstName(
                        response.data.first_name || response.data.username
                    );
                    if (name) {
                        setFirstName(name);
                    }
                }
            } catch (err) {
                console.log("Profile fetch for greeting:", err?.message || err);
            }
        }

        fetchUserProfile();

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, []);


    /* =====================================================
       LOAD DASHBOARD
    ===================================================== */

    async function loadDashboard(showLoader = true, targetStatementId = queryStatementId) {

        try {

            if (showLoader) {
                setLoading(true);
            }

            setError("");

            const data = await getDashboard(targetStatementId);

            console.log(
                "Dashboard API response:",
                data
            );

            setDashboard(data);

        } catch (error) {

            console.error(
                "Dashboard loading error:",
                error
            );

            setError(
                error.message ||
                "Unable to load dashboard."
            );

        } finally {

            if (showLoader) {
                setLoading(false);
            }
        }
    }


    /* =====================================================
       INITIAL LOAD / ON QUERY PARAM CHANGE
    ===================================================== */

    useEffect(() => {

        loadDashboard(true, queryStatementId);

    }, [queryStatementId]);


    /* =====================================================
       WAIT FOR BACKGROUND PROCESSING
    ===================================================== */

    async function waitForStatement(statementId) {

        const maxAttempts = 90;

        for (
            let attempt = 0;
            attempt < maxAttempts;
            attempt++
        ) {

            try {

                const response =
                    await getStatementStatus(
                        statementId
                    );

                console.log(
                    "Statement status:",
                    response
                );

                const currentStatus =
                    String(
                        response?.status || ""
                    ).toUpperCase();


                if (
                    currentStatus ===
                    "COMPLETED"
                ) {

                    setProcessingMessage(
                        "Analysis completed. Updating dashboard..."
                    );

                    return true;
                }


                if (
                    currentStatus ===
                    "FAILED"
                ) {

                    throw new Error(
                        response?.message ||
                        "Unable to analyze the bank statement."
                    );
                }


                if (
                    currentStatus ===
                    "PROCESSING" ||
                    currentStatus ===
                    "UPLOADED" ||
                    currentStatus ===
                    "PENDING"
                ) {

                    setProcessingMessage(
                        "Analyzing your statement..."
                    );
                }


                await new Promise(
                    (resolve) =>
                        setTimeout(
                            resolve,
                            2000
                        )
                );

            } catch (error) {

                console.error(
                    "Statement status error:",
                    error
                );

                throw error;
            }
        }


        throw new Error(
            "Statement processing is taking longer than expected. Please check your statements later."
        );
    }


    /* =====================================================
       UPLOAD STATEMENT
    ===================================================== */

    async function handleFileUpload(event) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }


        const allowedExtensions = [
            ".xls",
            ".xlsx",
        ];

        const fileName =
            file.name.toLowerCase();

        const isValidFile =
            allowedExtensions.some(
                (extension) =>
                    fileName.endsWith(
                        extension
                    )
            );


        if (!isValidFile) {

            setError(
                "Only XLS and XLSX files are supported."
            );

            event.target.value = "";

            return;
        }


        const maxFileSize =
            10 * 1024 * 1024;


        if (file.size > maxFileSize) {

            setError(
                "File size must be less than 10 MB."
            );

            event.target.value = "";

            return;
        }


        try {

            setUploading(true);

            setError("");

            setProcessingMessage(
                "Uploading your bank statement..."
            );


            const response =
                await uploadBankStatement(
                    file
                );


            console.log(
                "Upload response:",
                response
            );


            if (!response?.success) {

                throw new Error(
                    response?.message ||
                    "Unable to upload the bank statement."
                );
            }


            const statementId =
                response?.statement_id;


            if (!statementId) {

                throw new Error(
                    "Statement uploaded but no statement ID was returned."
                );
            }


            setProcessingMessage(
                "Statement uploaded. Analysis is running in the background..."
            );


            await waitForStatement(
                statementId
            );


            setProcessingMessage(
                "Analysis completed. Refreshing your dashboard..."
            );


            await loadDashboard(false, statementId);


            setProcessingMessage(
                "Dashboard updated successfully."
            );


            setTimeout(() => {
                setProcessingMessage("");
            }, 2500);


        } catch (error) {

            console.error(
                "Statement upload error:",
                error
            );

            setError(
                error.message ||
                "Unable to process the bank statement."
            );

            setProcessingMessage("");

        } finally {

            setUploading(false);

            event.target.value = "";
        }
    }


    /* =====================================================
       NORMALIZE DASHBOARD DATA
       
       These calculations are intentionally NOT useMemo.
       This prevents the React hook-order error.
    ===================================================== */

    const currentStatement =
        dashboard?.statement || null;

    const cards =
        dashboard?.cards || {};

    const categories =
        Array.isArray(
            dashboard?.categories
        )
            ? dashboard.categories
            : [];

    const monthly =
        Array.isArray(
            dashboard?.monthly
        )
            ? dashboard.monthly
            : [];

    const recentTransactions =
        Array.isArray(
            dashboard?.recent_transactions
        )
            ? dashboard.recent_transactions
            : [];

    const insights =
        insightsOverride || dashboard?.insights || {};


    /* =====================================================
       CATEGORY CHART DATA
    ===================================================== */

    const categoryChartData =
        categories
            .map((category) => {

                const amount =
                    safeNumber(
                        category?.total_amount ??
                        category?.amount ??
                        category?.total
                    );

                return {
                    ...category,
                    category:
                        category?.category ||
                        "Others",
                    amount,
                };
            })
            .filter(
                (category) =>
                    category.amount > 0
            );


    /* =====================================================
       TOP CATEGORY
    ===================================================== */

    const topCategory =
        categories.length > 0
            ? [
                ...categories
            ].sort(
                (a, b) =>
                    safeNumber(
                        b?.total_amount ??
                        b?.amount ??
                        b?.total
                    ) -
                    safeNumber(
                        a?.total_amount ??
                        a?.amount ??
                        a?.total
                    )
            )[0]
            : null;


    /* =====================================================
       TOTAL CATEGORY SPEND
    ===================================================== */

    const totalCategorySpend =
        categoryChartData.reduce(
            (
                total,
                category
            ) =>
                total +
                safeNumber(
                    category.amount
                ),
            0
        );


    /* =====================================================
       MONTHLY CHART DATA
       
       Supports:
       - income / expenses
       - total_income / total_expenses
       - credit / debit
    ===================================================== */

    const monthlyTotals =
        monthly.map((item, index) => {

            const income =
                safeNumber(
                    item?.income ??
                    item?.total_income ??
                    item?.credit ??
                    item?.credits ??
                    0
                );

            const expenses =
                safeNumber(
                    item?.expenses ??
                    item?.total_expenses ??
                    item?.debit ??
                    item?.debits ??
                    0
                );

            let monthName =
                getMonthLabel(item);


            /*
             * If backend does not provide month_name,
             * try to build a readable label.
             */

            if (!monthName) {

                const dateValue =
                    item?.month_date ||
                    item?.date;

                if (dateValue) {

                    const date =
                        new Date(
                            dateValue
                        );

                    if (
                        !Number.isNaN(
                            date.getTime()
                        )
                    ) {

                        monthName =
                            date.toLocaleDateString(
                                "en-IN",
                                {
                                    month: "short",
                                    year: "numeric",
                                }
                            );
                    }
                }
            }


            if (!monthName) {
                monthName = `Month ${index + 1}`;
            }


            return {
                ...item,
                month_name: monthName,
                income,
                expenses,
            };
        });


    /* =====================================================
       DEBUG CHART DATA
    ===================================================== */

    console.log(
        "Monthly chart data:",
        monthlyTotals
    );

    console.log(
        "Category chart data:",
        categoryChartData
    );


    /* =====================================================
       LOADING
    ===================================================== */

    if (loading) {

        return (
            <div className="page-background">

                <div className="dashboard-loading">

                    <div className="loading-spinner">
                        <FiActivity />
                    </div>

                    <h3>
                        Preparing your dashboard
                    </h3>

                    <p>
                        Analyzing your financial data...
                    </p>

                </div>

            </div>
        );
    }


    /* =====================================================
       EMPTY STATE
    ===================================================== */

    if (!dashboard?.has_data) {

        return (
            <div className="page-background">

                <div className="empty-dashboard">

                    <div className="empty-icon">
                        <FiCreditCard />
                    </div>

                    <span className="empty-label">
                        FINANCIAL DASHBOARD
                    </span>

                    <h1>
                        Start understanding
                        your finances
                    </h1>

                    <p>
                        Upload your bank statement to
                        analyze income, expenses,
                        spending categories and cash flow.
                    </p>


                    <input
                        type="file"
                        id="statement-upload-empty"
                        accept=".xlsx,.xls"
                        hidden
                        disabled={uploading}
                        onChange={
                            handleFileUpload
                        }
                    />


                    <label
                        htmlFor="statement-upload-empty"
                        className={
                            `primary-button ${uploading
                                ? "button-disabled"
                                : ""
                            }`
                        }
                    >

                        {uploading ? (
                            <FiActivity />
                        ) : (
                            <FiUpload />
                        )}

                        {uploading
                            ? "Analyzing..."
                            : "Upload Bank Statement"
                        }

                    </label>


                    {uploading &&
                        processingMessage && (

                            <div className="upload-progress">

                                <div className="loading-spinner small">
                                    <FiActivity />
                                </div>

                                <span>
                                    {processingMessage}
                                </span>

                            </div>

                        )}


                    {error && (
                        <p className="error">
                            {error}
                        </p>
                    )}

                </div>

            </div>
        );
    }


    /* =====================================================
       RETURN UI
    ===================================================== */

    return (

        <div className="page-background">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="page-header">

                <div>

                    <span className="dashboard-eyebrow">
                        FINANCIAL OVERVIEW
                    </span>

                    <h1>
                        {greeting}, {firstName || "User"}
                    </h1>

                    <p>
                        Here's your financial overview
                        based on your latest statement.
                    </p>

                </div>


                <div className="header-actions">

                    <input
                        type="file"
                        id="statement-upload"
                        accept=".xlsx,.xls"
                        hidden
                        disabled={uploading}
                        onChange={
                            handleFileUpload
                        }
                    />

                    <label
                        htmlFor="statement-upload"
                        className={
                            `primary-button ${uploading
                                ? "button-disabled"
                                : ""
                            }`
                        }
                    >

                        {uploading ? (
                            <FiActivity />
                        ) : (
                            <FiUpload />
                        )}

                        {uploading
                            ? "Analyzing..."
                            : "Upload Statement"
                        }

                    </label>

                </div>

            </div>


            {/* =================================================
                PROCESSING
            ================================================= */}

            {uploading &&
                processingMessage && (

                    <div className="processing-banner">

                        <div className="processing-icon">
                            <FiActivity />
                        </div>

                        <div>

                            <strong>
                                Statement analysis in progress
                            </strong>

                            <span>
                                {processingMessage}
                            </span>

                        </div>

                    </div>
                )}


            {/* =================================================
                ERROR
            ================================================= */}

            {error && (

                <div className="error-box">

                    <FiAlertCircle />

                    <span>
                        {error}
                    </span>

                </div>
            )}


            {/* =================================================
                ACTIVE STATEMENT DETAILS
            ================================================= */}

            {currentStatement && (
                <div className="active-statement-banner">
                    <div className="statement-banner-main">
                        <div className="statement-file-icon">
                            <FiFileText />
                        </div>
                        <div className="statement-file-details">
                            <div className="statement-file-title-row">
                                <span className="statement-badge">ANALYZED FILE</span>
                                <h3 className="statement-file-name" title={currentStatement.file_name}>
                                    {currentStatement.file_name}
                                </h3>
                            </div>
                            <div className="statement-meta-row">
                                {(currentStatement.from || currentStatement.to) && (
                                    <span className="statement-meta-pill">
                                        <FiCalendar />
                                        <span>
                                            {currentStatement.from ? new Date(currentStatement.from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                            {currentStatement.from && currentStatement.to ? " – " : ""}
                                            {currentStatement.to ? new Date(currentStatement.to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                                        </span>
                                    </span>
                                )}
                                {currentStatement.uploaded_at && (
                                    <span className="statement-meta-pill">
                                        <FiClock />
                                        <span>
                                            Uploaded {new Date(currentStatement.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                    </span>
                                )}
                                {cards.transaction_count !== undefined && (
                                    <span className="statement-meta-pill highlight">
                                        <FiActivity />
                                        <span>{cards.transaction_count} Transactions</span>
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* =================================================
                KPI CARDS
            ================================================= */}

            <div className="metrics-grid">

                <MetricCard
                    title="Total Income"
                    value={
                        formatCurrency(
                            cards.total_income
                        )
                    }
                    icon={<FiArrowUp />}
                    type="income"
                    description="Total money received"
                />


                <MetricCard
                    title="Total Expenses"
                    value={
                        formatCurrency(
                            cards.total_expenses
                        )
                    }
                    icon={<FiArrowDown />}
                    type="expense"
                    description="Total money spent"
                />


                <MetricCard
                    title="Net Cash Flow"
                    value={
                        formatCurrency(
                            cards.net_cash_flow
                        )
                    }
                    icon={<FiActivity />}
                    type={
                        safeNumber(
                            cards.net_cash_flow
                        ) >= 0
                            ? "income"
                            : "expense"
                    }
                    description="Income minus expenses"
                />


                <MetricCard
                    title="Savings Rate"
                    value={
                        `${safeNumber(
                            cards.savings_rate
                        ).toFixed(1)}%`
                    }
                    icon={<FiPercent />}
                    type="savings"
                    description="Percentage saved"
                />

            </div>


            {/* =================================================
                MAIN CHART GRID
            ================================================= */}

            <div className="dashboard-grid">


                {/* =================================================
                    INCOME VS EXPENSES
                ================================================= */}

                <div className="dashboard-card cash-flow-card">

                    <div className="card-heading">

                        <div>

                            <span className="card-label">
                                CASH FLOW
                            </span>

                            <h3>
                                Income vs Expenses
                            </h3>

                            <p>
                                Monthly movement of your money
                            </p>

                        </div>


                        <div className="chart-summary">

                            <span>
                                Net
                            </span>

                            <strong>
                                {formatCompactCurrency(
                                    cards.net_cash_flow
                                )}
                            </strong>

                        </div>

                    </div>


                    {monthlyTotals.length > 0 ? (

                        <div className="chart-container cash-flow-chart">

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <AreaChart
                                    data={monthlyTotals}
                                    margin={{
                                        top: 10,
                                        right: 15,
                                        left: 5,
                                        bottom: 10,
                                    }}
                                >

                                    <defs>

                                        <linearGradient
                                            id="incomeGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >

                                            <stop
                                                offset="0%"
                                                stopColor="#6366f1"
                                                stopOpacity={0.30}
                                            />

                                            <stop
                                                offset="100%"
                                                stopColor="#6366f1"
                                                stopOpacity={0}
                                            />

                                        </linearGradient>


                                        <linearGradient
                                            id="expenseGradient"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >

                                            <stop
                                                offset="0%"
                                                stopColor="#ef4444"
                                                stopOpacity={0.20}
                                            />

                                            <stop
                                                offset="100%"
                                                stopColor="#ef4444"
                                                stopOpacity={0}
                                            />

                                        </linearGradient>

                                    </defs>


                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        vertical={false}
                                        stroke="#eef0f4"
                                    />


                                    <XAxis
                                        dataKey="month_name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#9ca3af",
                                            fontSize: 11,
                                        }}
                                        interval="preserveStartEnd"
                                    />


                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#9ca3af",
                                            fontSize: 11,
                                        }}
                                        tickFormatter={
                                            formatCompactCurrency
                                        }
                                        width={55}
                                    />


                                    <Tooltip
                                        content={
                                            <CashFlowTooltip />
                                        }
                                    />


                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        name="Income"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fill="url(#incomeGradient)"
                                        dot={false}
                                        activeDot={{
                                            r: 5,
                                        }}
                                        connectNulls
                                    />


                                    <Area
                                        type="monotone"
                                        dataKey="expenses"
                                        name="Expenses"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        fill="url(#expenseGradient)"
                                        dot={false}
                                        activeDot={{
                                            r: 5,
                                        }}
                                        connectNulls
                                    />

                                </AreaChart>

                            </ResponsiveContainer>

                        </div>

                    ) : (

                        <div className="chart-empty">

                            <FiActivity />

                            <span>
                                No monthly cash-flow data available.
                            </span>

                        </div>
                    )}


                    <div className="chart-legend">

                        <span>
                            <i className="legend-income" />
                            Income
                        </span>

                        <span>
                            <i className="legend-expense" />
                            Expenses
                        </span>

                    </div>

                </div>


                {/* =================================================
                    CATEGORY DONUT
                ================================================= */}

                <div className="dashboard-card">

                    <div className="card-heading">

                        <div>

                            <span className="card-label">
                                SPENDING
                            </span>

                            <h3>
                                Where your money goes
                            </h3>

                            <p>
                                Expense distribution
                            </p>

                        </div>

                    </div>


                    {categoryChartData.length > 0 ? (

                        <div className="donut-wrapper">

                            <ResponsiveContainer
                                width="100%"
                                height={250}
                            >

                                <PieChart>

                                    <Pie
                                        data={categoryChartData}
                                        dataKey="amount"
                                        nameKey="category"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={65}
                                        outerRadius={95}
                                        paddingAngle={4}
                                        stroke="none"
                                    >

                                        {categoryChartData.map(
                                            (_, index) => (

                                                <Cell
                                                    key={`category-${index}`}
                                                    fill={
                                                        CATEGORY_COLORS[
                                                        index %
                                                        CATEGORY_COLORS.length
                                                        ]
                                                    }
                                                />

                                            )
                                        )}

                                    </Pie>


                                    <Tooltip
                                        content={
                                            <CategoryTooltip />
                                        }
                                    />

                                </PieChart>

                            </ResponsiveContainer>


                            <div className="donut-center">

                                <strong>
                                    {formatCompactCurrency(
                                        totalCategorySpend
                                    )}
                                </strong>

                                <span>
                                    Total spent
                                </span>

                            </div>

                        </div>

                    ) : (

                        <div className="chart-empty small-empty">

                            <FiActivity />

                            <span>
                                No category data available.
                            </span>

                        </div>

                    )}


                    <div className="category-mini-list">

                        {categories
                            .slice(0, 5)
                            .map(
                                (
                                    category,
                                    index
                                ) => (

                                    <div
                                        className="category-mini-row"
                                        key={
                                            category.category ||
                                            index
                                        }
                                    >

                                        <span>

                                            <i
                                                style={{
                                                    background:
                                                        CATEGORY_COLORS[
                                                        index %
                                                        CATEGORY_COLORS.length
                                                        ],
                                                }}
                                            />

                                            {
                                                category.category ||
                                                "Others"
                                            }

                                        </span>


                                        <strong>
                                            {safeNumber(
                                                category.percentage
                                            ).toFixed(1)}
                                            %
                                        </strong>

                                    </div>
                                )
                            )}

                    </div>

                </div>

            </div>


            {/* =================================================
                SECONDARY CHART
            ================================================= */}

            <div className="dashboard-grid">


                {/* =================================================
                    MONTHLY EXPENSES
                ================================================= */}

                <div className="dashboard-card">

                    <div className="card-heading">

                        <div>

                            <span className="card-label">
                                EXPENSE ANALYSIS
                            </span>

                            <h3>
                                Monthly Expenses
                            </h3>

                            <p>
                                Compare spending across months
                            </p>

                        </div>

                    </div>


                    {monthlyTotals.length > 0 ? (

                        <div className="chart-container monthly-expense-chart">

                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >

                                <BarChart
                                    data={monthlyTotals}
                                    margin={{
                                        top: 10,
                                        right: 15,
                                        left: 5,
                                        bottom: 10,
                                    }}
                                >

                                    <CartesianGrid
                                        strokeDasharray="4 4"
                                        vertical={false}
                                        stroke="#eef0f4"
                                    />


                                    <XAxis
                                        dataKey="month_name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#9ca3af",
                                            fontSize: 11,
                                        }}
                                        interval="preserveStartEnd"
                                    />


                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{
                                            fill: "#9ca3af",
                                            fontSize: 11,
                                        }}
                                        tickFormatter={
                                            formatCompactCurrency
                                        }
                                        width={55}
                                    />


                                    <Tooltip
                                        content={
                                            <MonthlyExpenseTooltip />
                                        }
                                    />


                                    <Bar
                                        dataKey="expenses"
                                        name="Expenses"
                                        fill="#6366f1"
                                        radius={[
                                            8,
                                            8,
                                            0,
                                            0,
                                        ]}
                                        maxBarSize={50}
                                        minPointSize={3}
                                    />

                                </BarChart>

                            </ResponsiveContainer>

                        </div>

                    ) : (

                        <div className="chart-empty">

                            <FiActivity />

                            <span>
                                No monthly expense data available.
                            </span>

                        </div>
                    )}

                </div>


                {/* =================================================
                    TOP CATEGORY
                ================================================= */}

                <div className="dashboard-card spending-highlight">

                    <div className="card-heading">

                        <div>

                            <span className="card-label">
                                TOP SPENDING
                            </span>

                            <h3>
                                Biggest category
                            </h3>

                            <p>
                                Your highest expense area
                            </p>

                        </div>

                    </div>


                    {topCategory ? (

                        <>

                            <div className="highlight-icon">

                                {getCategoryIcon(
                                    topCategory.category
                                )}

                            </div>


                            <h2>
                                {
                                    topCategory.category ||
                                    "Others"
                                }
                            </h2>


                            <div className="highlight-amount">

                                {formatCurrency(
                                    topCategory.total_amount ??
                                    topCategory.amount
                                )}

                            </div>


                            <div className="highlight-progress">

                                <div
                                    style={{
                                        width:
                                            `${Math.min(
                                                safeNumber(
                                                    topCategory.percentage
                                                ),
                                                100
                                            )}%`,
                                    }}
                                />

                            </div>


                            <p className="highlight-description">

                                {safeNumber(
                                    topCategory.percentage
                                ).toFixed(1)}

                                % of your total spending

                            </p>

                        </>

                    ) : (

                        <div className="no-data">
                            No category data available.
                        </div>

                    )}

                </div>

            </div>


            {/* =================================================
                CATEGORY BREAKDOWN
            ================================================= */}

            <div className="dashboard-card category-breakdown-card">

                <div className="card-heading">

                    <div>

                        <span className="card-label">
                            BREAKDOWN
                        </span>

                        <h3>
                            Expense Categories
                        </h3>

                        <p>
                            Detailed view of your spending
                        </p>

                    </div>

                </div>


                <div className="category-list">

                    {categories.length > 0 ? (

                        categories.map(
                            (
                                category,
                                index
                            ) => (

                                <div
                                    className="category-row"
                                    key={
                                        category.category ||
                                        index
                                    }
                                >

                                    <div className="category-left">

                                        <div className="category-icon">

                                            {getCategoryIcon(
                                                category.category
                                            )}

                                        </div>


                                        <div>

                                            <strong>
                                                {
                                                    category.category ||
                                                    "Others"
                                                }
                                            </strong>

                                            <small>

                                                {
                                                    category.transaction_count ||
                                                    0
                                                }

                                                {" "}
                                                transactions

                                            </small>

                                        </div>

                                    </div>


                                    <div className="category-middle">

                                        <div className="category-progress">

                                            <div
                                                className="category-progress-bar"
                                                style={{
                                                    width:
                                                        `${Math.min(
                                                            safeNumber(
                                                                category.percentage
                                                            ),
                                                            100
                                                        )}%`,
                                                }}
                                            />

                                        </div>

                                    </div>


                                    <div className="category-right">

                                        <strong>
                                            {formatCurrency(
                                                category.total_amount ??
                                                category.amount
                                            )}
                                        </strong>

                                        <small>

                                            {safeNumber(
                                                category.percentage
                                            ).toFixed(1)}

                                            %

                                        </small>

                                    </div>

                                </div>

                            )
                        )

                    ) : (

                        <div className="no-data">
                            No expense categories available.
                        </div>

                    )}

                </div>

            </div>


            {/* =================================================
                TRANSACTIONS + AI
            ================================================= */}

            <div className="dashboard-grid">


                {/* =================================================
                    RECENT TRANSACTIONS
                ================================================= */}

                <div className="dashboard-card recent-transactions-card" ref={recentCardRef}>

                    <div className="card-heading">

                        <div>

                            <span className="card-label">
                                ACTIVITY
                            </span>

                            <h3>
                                Recent Transactions
                            </h3>

                            <p>
                                Your latest banking activity
                            </p>

                        </div>


                        <Link
                            to={
                                currentStatement?.id
                                    ? `/transactions?statement_id=${currentStatement.id}`
                                    : "/transactions"
                            }
                            className="view-all"
                        >

                            View all

                            <FiArrowRight />

                        </Link>

                    </div>


                    <div className="recent-transactions-list">

                        {recentTransactions.length > 0 ? (

                            recentTransactions
                                .slice(0, visibleTxCount)
                                .map(
                                    (
                                        transaction
                                    ) => (

                                        <Transaction
                                            key={
                                                transaction.id
                                            }
                                            transaction={
                                                transaction
                                            }
                                        />

                                    )
                                )

                        ) : (

                            <div className="no-data">
                                No recent transactions.
                            </div>

                        )}

                    </div>

                </div>


                {/* =================================================
                    AI INSIGHTS
                ================================================= */}

                <div className="dashboard-card ai-card" ref={aiCardRef}>

                    <div className="ai-card-inner" ref={aiContentRef}>

                        <div className="card-heading">

                            <div>

                                <div className="ai-heading-eyebrow-row">
                                    <span className="card-label">
                                        SMART ANALYSIS
                                    </span>
                                    <span
                                        className="ai-privacy-pill"
                                        title="Processed 100% locally on your machine. No data is sent to external servers or the internet."
                                    >
                                        <FiLock /> 100% Local & Private
                                    </span>
                                    <span
                                        className="ai-model-pill"
                                        title="Running on local Ollama engine"
                                    >
                                        <FiCpu /> llama3.2
                                    </span>
                                </div>

                                <h3>
                                    AI Financial Insights
                                </h3>

                                <p>
                                    Personalized financial observations & advice from your local Ollama AI model.
                                </p>

                            </div>

                            <div className="ai-header-actions">
                                <button
                                    type="button"
                                    className="ai-refresh-btn"
                                    onClick={handleGenerateInsights}
                                    disabled={generatingInsights}
                                    title="Analyze / Regenerate financial insights with local Ollama"
                                >
                                    <FiRefreshCw className={generatingInsights ? "spin" : ""} />
                                    <span>{generatingInsights ? "Analyzing..." : "Analyze with Local AI"}</span>
                                </button>
                                <div className="ai-icon-badge">
                                    ✦
                                </div>
                            </div>

                        </div>


                        {insightsError && (
                            <div className="ai-error-banner">
                                <FiAlertCircle />
                                <span>{insightsError}</span>
                            </div>
                        )}


                        {generatingInsights ? (
                            <div className="ai-generating-state">
                                <div className="ai-pulse-spinner"></div>
                                <div className="ai-generating-text">
                                    <strong>Local Ollama (llama3.2) is analyzing your finances...</strong>
                                    <span>Evaluating income, expenses, cash flow ratio & spending patterns strictly offline.</span>
                                </div>
                            </div>
                        ) : (
                            <>
                                {insights?.financial_health && (
                                    <div className="ai-health-row">
                                        <span className="ai-health-label">Financial Health:</span>
                                        <span className={`ai-health-badge health-${String(insights.financial_health).toLowerCase().replace(/\s+/g, "-")}`}>
                                            <FiActivity /> {insights.financial_health}
                                        </span>
                                    </div>
                                )}

                                {Array.isArray(insights?.key_takeaways) && insights.key_takeaways.length > 0 && (
                                    <div className="ai-takeaways-list">
                                        {insights.key_takeaways.map((takeaway, idx) => (
                                            <span key={idx} className="ai-takeaway-pill">
                                                • {takeaway}
                                            </span>
                                        ))}
                                    </div>
                                )}

                                <div className="ai-summary">
                                    {insights?.summary ? (
                                        <p className="ai-summary-text">{insights.summary}</p>
                                    ) : (
                                        <div className="ai-empty-prompt">
                                            <p>No AI summary generated yet for this statement.</p>
                                            <button
                                                type="button"
                                                className="primary-button ai-analyze-prompt-btn"
                                                onClick={handleGenerateInsights}
                                                disabled={generatingInsights}
                                            >
                                                <FiZap /> Generate Insights with Local AI
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {Array.isArray(insights?.recommendations) && insights.recommendations.length > 0 && (
                                    <div className="recommendations">
                                        <h4>
                                            Personalized Recommendations
                                        </h4>
                                        <ul>
                                            {insights.recommendations.slice(0, 5).map((recommendation, index) => (
                                                <li key={index}>
                                                    <span>
                                                        <FiCheckCircle />
                                                    </span>
                                                    <div>
                                                        {typeof recommendation === "string" ? recommendation : recommendation.text || JSON.stringify(recommendation)}
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}

                    </div>

                </div>

            </div>

        </div>
    );
}


/* =========================================================
   METRIC CARD
========================================================= */

function MetricCard({
    title,
    value,
    icon,
    type,
    description,
}) {

    const isPositive =
        type !== "expense";


    return (

        <div
            className={
                `metric-card metric-${type}`
            }
        >

            <div className="metric-top">

                <div className="metric-icon">
                    {icon}
                </div>


                <span
                    className={
                        isPositive
                            ? "metric-status positive"
                            : "metric-status negative"
                    }
                >

                    {isPositive ? (

                        <>
                            <FiTrendingUp />
                            Positive
                        </>

                    ) : (

                        <>
                            <FiTrendingDown />
                            Spending
                        </>

                    )}

                </span>

            </div>


            <span className="metric-title">
                {title}
            </span>


            <h2>
                {value}
            </h2>


            <p>
                {description}
            </p>

        </div>
    );
}


/* =========================================================
   TRANSACTION
========================================================= */

function Transaction({
    transaction,
}) {

    const isCredit =
        String(
            transaction?.transaction_type || ""
        ).toUpperCase() === "CREDIT";


    const amount =
        isCredit
            ? transaction?.credit
            : transaction?.debit;


    return (

        <div className="transaction">

            <span
                className={
                    `transaction-icon ${isCredit
                        ? "credit"
                        : "debit"
                    }`
                }
            >

                {isCredit
                    ? <FiArrowDown />
                    : <FiArrowUp />
                }

            </span>


            <div className="transaction-details">

                <strong>

                    {
                        transaction?.merchant ||
                        transaction?.description ||
                        "Transaction"
                    }

                </strong>


                <small>

                    {
                        transaction?.transaction_date ||
                        "-"
                    }

                    {" · "}

                    {
                        transaction?.category ||
                        "Other"
                    }

                </small>

            </div>


            <div className="transaction-amount">

                <b
                    className={
                        isCredit
                            ? "credit-text"
                            : "debit-text"
                    }
                >

                    {isCredit
                        ? "+"
                        : "-"
                    }

                    {formatCurrency(
                        amount
                    )}

                </b>

            </div>

        </div>
    );
}


export default Dashboard;
