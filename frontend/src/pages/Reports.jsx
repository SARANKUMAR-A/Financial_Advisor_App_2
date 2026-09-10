function Reports() {

    const reports = [
        {
            title: "Monthly Financial Summary",
            description:
                "Complete overview of income, expenses, assets and liabilities.",
        },
        {
            title: "Cash Flow Analysis",
            description:
                "Understand your cash inflow and outflow trends.",
        },
        {
            title: "Investment Performance",
            description:
                "Review portfolio allocation and investment returns.",
        },
        {
            title: "Expense Breakdown",
            description:
                "Analyze spending patterns by category.",
        },
    ];

    return (
        <div className="page-background">

            <div className="page-header">

                <div>

                    <small>INSIGHTS</small>

                    <h1>Reports</h1>

                    <p>
                        Generate structured financial reports.
                    </p>

                </div>

                <button className="primary-button">
                    + Generate Report
                </button>

            </div>

            <div className="reports-grid">

                {reports.map((report) => (

                    <div
                        className="report-card"
                        key={report.title}
                    >

                        <div className="report-icon">
                            ▤
                        </div>

                        <h3>
                            {report.title}
                        </h3>

                        <p>
                            {report.description}
                        </p>

                        <button className="secondary-button">
                            View Report
                        </button>

                        <button className="text-button">
                            Download ↓
                        </button>

                    </div>

                ))}

            </div>

        </div>
    );
}

export default Reports;