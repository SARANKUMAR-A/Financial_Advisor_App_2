function FinancialData() {

    const data = [
        [
            "ICICI Bank",
            "Bank Account",
            "₹8,42,500",
            "Sep 06, 2026",
        ],
        [
            "HDFC Mutual Fund",
            "Investment",
            "₹6,25,000",
            "Sep 05, 2026",
        ],
        [
            "LIC Policy",
            "Insurance",
            "₹4,80,000",
            "Sep 02, 2026",
        ],
        [
            "Property - Chennai",
            "Real Estate",
            "₹18,50,000",
            "Aug 28, 2026",
        ],
    ];

    return (
        <div className="page-background">

            <div className="page-header">

                <div>

                    <small>DATA MANAGEMENT</small>

                    <h1>Financial Data</h1>

                    <p>
                        Manage and organize your
                        financial information.
                    </p>

                </div>

                <button className="primary-button">
                    + Add Data
                </button>

            </div>

            <div className="toolbar">

                <input
                    placeholder="⌕ Search financial data..."
                />

                <select>
                    <option>All Types</option>
                    <option>Assets</option>
                    <option>Liabilities</option>
                    <option>Investments</option>
                </select>

                <button>
                    Export
                </button>

            </div>

            <div className="table-card">

                <table>

                    <thead>

                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Value</th>
                            <th>Last Updated</th>
                            <th>Status</th>
                        </tr>

                    </thead>

                    <tbody>

                        {data.map((row) => (

                            <tr key={row[0]}>

                                <td>
                                    <strong>
                                        {row[0]}
                                    </strong>
                                </td>

                                <td>{row[1]}</td>

                                <td className="positive">
                                    {row[2]}
                                </td>

                                <td>{row[3]}</td>

                                <td>
                                    <span className="status">
                                        Active
                                    </span>
                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>
    );
}

export default FinancialData;