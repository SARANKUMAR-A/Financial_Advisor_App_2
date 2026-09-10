function Transactions() {

    const transactions = [
        ["Salary Credit", "Income", "₹1,25,000"],
        ["Amazon Purchase", "Shopping", "-₹4,250"],
        ["Investment SIP", "Investment", "-₹10,000"],
        ["Electricity Bill", "Utilities", "-₹3,850"],
        ["Interest Credit", "Income", "₹2,450"],
    ];

    return (
        <div className="page-background">

            <div className="page-header">

                <div>

                    <small>ACTIVITY</small>

                    <h1>Transactions</h1>

                    <p>
                        Track income, expenses and transfers.
                    </p>

                </div>

                <button className="primary-button">
                    + Add Transaction
                </button>

            </div>

            <div className="toolbar">

                <input
                    placeholder="⌕ Search transactions..."
                />

                <select>
                    <option>All Categories</option>
                </select>

                <select>
                    <option>September 2026</option>
                </select>

            </div>

            <div className="table-card">

                <table>

                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Amount</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>

                    <tbody>

                        {transactions.map(
                            ([title, category, amount]) => (

                                <tr key={title}>

                                    <td>
                                        <strong>
                                            {title}
                                        </strong>
                                    </td>

                                    <td>
                                        {category}
                                    </td>

                                    <td
                                        className={
                                            amount.startsWith("-")
                                                ? "negative"
                                                : "positive"
                                        }
                                    >
                                        {amount}
                                    </td>

                                    <td>
                                        Sep 05, 2026
                                    </td>

                                    <td>
                                        <span className="status">
                                            Completed
                                        </span>
                                    </td>

                                </tr>

                            )
                        )}

                    </tbody>

                </table>

            </div>

        </div>
    );
}

export default Transactions;