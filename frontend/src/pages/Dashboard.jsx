import { useEffect, useState } from "react";

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
} from "react-icons/fi";

import {
    getDashboard,
    uploadBankStatement,
    getStatementStatus,
} from "../services/api";

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

    return `₹${Number(value).toLocaleString("en-IN", {
        maximumFractionDigits: 0,
    })}`;
}


function formatCompactCurrency(value) {

    const number = Number(value || 0);

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
        name.includes("dining")
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
   CUSTOM TOOLTIP
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

                <p key={item.dataKey}>

                    <span>
                        {item.name}
                    </span>

                    <b>
                        {formatCurrency(item.value)}
                    </b>

                </p>

            ))}

        </div>
    );
}


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
   DASHBOARD
========================================================= */

function Dashboard() {

    const [dashboard, setDashboard] = useState(null);

    const [loading, setLoading] = useState(true);

    const [uploading, setUploading] = useState(false);

    const [processingMessage, setProcessingMessage] =
        useState("");

    const [error, setError] = useState("");


    /* =====================================================
       LOAD DASHBOARD
    ===================================================== */

    async function loadDashboard(
        showLoader = true
    ) {

        try {

            if (showLoader) {
                setLoading(true);
            }

            setError("");

            const data =
                await getDashboard();

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
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        loadDashboard();

    }, []);


    /* =====================================================
       WAIT FOR BACKGROUND PROCESSING
    ===================================================== */

    async function waitForStatement(
        statementId
    ) {

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

                const currentStatus =
                    String(
                        response?.status || ""
                    ).toUpperCase();


                /* -----------------------------------------
                   COMPLETED
                ----------------------------------------- */

                if (
                    currentStatus ===
                    "COMPLETED"
                ) {

                    setProcessingMessage(
                        "Analysis completed. Updating dashboard..."
                    );

                    return true;
                }


                /* -----------------------------------------
                   FAILED
                ----------------------------------------- */

                if (
                    currentStatus ===
                    "FAILED"
                ) {

                    throw new Error(
                        response?.message ||
                        "Unable to analyze the bank statement."
                    );
                }


                /* -----------------------------------------
                   PROCESSING
                ----------------------------------------- */

                if (
                    currentStatus ===
                    "PROCESSING" ||
                    currentStatus ===
                    "UPLOADED"
                ) {

                    setProcessingMessage(
                        `Analyzing your statement...`
                    );

                }


                /* -----------------------------------------
                   WAIT
                ----------------------------------------- */

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

    async function handleFileUpload(
        event
    ) {

        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }


        /* -----------------------------------------
           Basic frontend validation
        ----------------------------------------- */

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


        /* -----------------------------------------
           File size
        ----------------------------------------- */

        const maxFileSize =
            10 * 1024 * 1024;


        if (
            file.size >
            maxFileSize
        ) {

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


            /* -----------------------------------------
               Upload
            ----------------------------------------- */

            const response =
                await uploadBankStatement(
                    file
                );


            console.log(
                "Upload response:",
                response
            );


            if (
                !response?.success
            ) {

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


            /* -----------------------------------------
               Background processing
            ----------------------------------------- */

            setProcessingMessage(
                "Statement uploaded. Analysis is running in the background..."
            );


            await waitForStatement(
                statementId
            );


            /* -----------------------------------------
               Refresh dashboard
            ----------------------------------------- */

            setProcessingMessage(
                "Analysis completed. Refreshing your dashboard..."
            );


            await loadDashboard(
                false
            );


            setProcessingMessage(
                "Dashboard updated successfully."
            );


            /* -----------------------------------------
               Hide success message
               after short delay
            ----------------------------------------- */

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

            /*
             * Reset input so the user can upload
             * the same file again if required.
             */

            event.target.value = "";
        }
    }


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
                            `primary-button ${
                                uploading
                                    ? "button-disabled"
                                    : ""
                            }`
                        }
                    >

                        <FiUpload />

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
       DATA
    ===================================================== */

    const {
        cards = {},
        categories = [],
        monthly = [],
        recent_transactions = [],
        insights = {},
    } = dashboard;


    /* =====================================================
       DERIVED DATA
    ===================================================== */

    const categoryChartData =
        categories.map(
            (category) => ({

                ...category,

                amount:
                    Number(
                        category.total_amount ||
                        0
                    ),

            })
        );


    const topCategory =
        categories.length
            ? [
                ...categories
            ].sort(
                (a, b) =>
                    Number(
                        b.total_amount ||
                        0
                    ) -
                    Number(
                        a.total_amount ||
                        0
                    )
            )[0]
            : null;


    const totalCategorySpend =
        categories.reduce(
            (
                total,
                category
            ) =>
                total +
                Number(
                    category.total_amount ||
                    0
                ),
            0
        );


    const monthlyTotals =
        monthly.map(
            (item) => ({

                ...item,

                income:
                    Number(
                        item.income ||
                        0
                    ),

                expenses:
                    Number(
                        item.expenses ||
                        0
                    ),

            })
        );


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
                        Good morning, Sarankumar
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
                            `primary-button ${
                                uploading
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
                PROCESSING MESSAGE
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
                        Number(
                            cards.net_cash_flow ||
                            0
                        ) >= 0
                            ? "income"
                            : "expense"
                    }
                    description="Income minus expenses"
                />


                <MetricCard
                    title="Savings Rate"
                    value={`${Number(
                        cards.savings_rate ||
                        0
                    ).toFixed(1)}%`}
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
                    CASH FLOW
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


                    <div className="chart-container">

                        <ResponsiveContainer
                            width="100%"
                            height={340}
                        >

                            <AreaChart
                                data={
                                    monthlyTotals
                                }
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 0,
                                    bottom: 0,
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
                                            stopColor="#f87171"
                                            stopOpacity={0.18}
                                        />

                                        <stop
                                            offset="100%"
                                            stopColor="#f87171"
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
                                />

                            </AreaChart>

                        </ResponsiveContainer>

                    </div>


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


                    <div className="donut-wrapper">

                        <ResponsiveContainer
                            width="100%"
                            height={250}
                        >

                            <PieChart>

                                <Pie
                                    data={
                                        categoryChartData
                                    }
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
                                                key={index}
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


                    {/* CATEGORY LEGEND */}

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
                                            category.category
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
                                                category.category
                                            }

                                        </span>


                                        <strong>
                                            {Number(
                                                category.percentage ||
                                                0
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


                {/* MONTHLY EXPENSE BAR */}

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


                    <div className="chart-container">

                        <ResponsiveContainer
                            width="100%"
                            height={300}
                        >

                            <BarChart
                                data={
                                    monthlyTotals
                                }
                                margin={{
                                    top: 10,
                                    right: 10,
                                    left: 0,
                                    bottom: 0,
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
                                />

                                <Tooltip
                                    formatter={(value) =>
                                        formatCurrency(
                                            value
                                        )
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
                                    maxBarSize={42}
                                />

                            </BarChart>

                        </ResponsiveContainer>

                    </div>

                </div>


                {/* TOP CATEGORY */}

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
                                    topCategory.category
                                }
                            </h2>


                            <div className="highlight-amount">

                                {formatCurrency(
                                    topCategory.total_amount
                                )}

                            </div>


                            <div className="highlight-progress">

                                <div
                                    style={{
                                        width:
                                            `${Math.min(
                                                Number(
                                                    topCategory.percentage ||
                                                    0
                                                ),
                                                100
                                            )}%`,
                                    }}
                                />

                            </div>


                            <p className="highlight-description">

                                {Number(
                                    topCategory.percentage ||
                                    0
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

            <div className="dashboard-card">

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

                    {categories.map(
                        (
                            category
                        ) => (

                            <div
                                className="category-row"
                                key={
                                    category.category
                                }
                            >

                                <div className="category-left">

                                    <div
                                        className="category-icon"
                                    >

                                        {getCategoryIcon(
                                            category.category
                                        )}

                                    </div>


                                    <div>

                                        <strong>
                                            {
                                                category.category
                                            }
                                        </strong>

                                        <small>

                                            {
                                                category.transaction_count
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
                                                        Number(
                                                            category.percentage ||
                                                            0
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
                                            category.total_amount
                                        )}
                                    </strong>

                                    <small>

                                        {Number(
                                            category.percentage ||
                                            0
                                        ).toFixed(1)}

                                        %

                                    </small>

                                </div>

                            </div>

                        )
                    )}

                </div>

            </div>


            {/* =================================================
                TRANSACTIONS + AI
            ================================================= */}

            <div className="dashboard-grid">


                {/* RECENT TRANSACTIONS */}

                <div className="dashboard-card">

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


                        <a
                            href="/transactions"
                            className="view-all"
                        >

                            View all

                            <FiArrowRight />

                        </a>

                    </div>


                    <div>

                        {recent_transactions.length >
                        0 ? (

                            recent_transactions
                                .slice(0, 6)
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


                {/* AI INSIGHTS */}

                <div className="dashboard-card ai-card">

                    <div className="ai-header">

                        <div className="ai-icon">
                            ✦
                        </div>

                        <div>

                            <span className="card-label">
                                SMART ANALYSIS
                            </span>

                            <h3>
                                AI Financial Insights
                            </h3>

                        </div>

                    </div>


                    <p className="ai-subtitle">

                        Personalized observations from
                        your bank statement.

                    </p>


                    <div className="ai-summary">

                        {insights?.summary ||
                            "No AI summary available."}

                    </div>


                    {insights?.recommendations?.length >
                        0 && (

                            <div className="recommendations">

                                <h4>
                                    Recommendations
                                </h4>

                                <ul>

                                    {insights.recommendations
                                        .slice(0, 4)
                                        .map(
                                            (
                                                recommendation,
                                                index
                                            ) => (

                                                <li
                                                    key={
                                                        index
                                                    }
                                                >

                                                    <span>
                                                        <FiCheckCircle />
                                                    </span>

                                                    {
                                                        recommendation
                                                    }

                                                </li>

                                            )
                                        )}

                                </ul>

                            </div>

                        )}

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
        transaction.transaction_type ===
        "CREDIT";


    return (

        <div className="transaction">

            <span
                className={
                    `transaction-icon ${
                        isCredit
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
                        transaction.merchant ||
                        transaction.description ||
                        "Transaction"
                    }

                </strong>


                <small>

                    {
                        transaction.transaction_date
                    }

                    {" · "}

                    {
                        transaction.category ||
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
                        isCredit
                            ? transaction.credit
                            : transaction.debit
                    )}

                </b>

            </div>

        </div>
    );
}


export default Dashboard;
