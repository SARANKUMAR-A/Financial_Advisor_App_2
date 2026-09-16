function Settings() {

    return (
        <div className="page-background">

            <div className="page-header">

                <div>

                    <span className="dashboard-eyebrow">
                        ACCOUNT
                    </span>

                    <h1>Settings</h1>

                    <p>
                        Configure your Fin AI workspace.
                    </p>

                </div>

                <button className="primary-button">
                    Save Changes
                </button>

            </div>

            <div className="settings-list">

                <Setting
                    title="Email Notifications"
                    description="Receive alerts about account activity."
                />

                <Setting
                    title="Monthly Summary"
                    description="Receive your monthly financial summary."
                />

                <Setting
                    title="Two-Factor Authentication"
                    description="Add an additional layer of security."
                    button="Enable 2FA"
                />

                <div className="setting danger-setting">

                    <div>
                        <h3>Delete Account</h3>
                        <p>
                            Permanently remove your account.
                        </p>
                    </div>

                    <button className="danger-button">
                        Delete Account
                    </button>

                </div>

            </div>

        </div>
    );
}

function Setting({
    title,
    description,
    button,
}) {

    return (
        <div className="setting">

            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>

            {button ? (
                <button className="secondary-button">
                    {button}
                </button>
            ) : (
                <label className="switch">
                    <input
                        type="checkbox"
                        defaultChecked
                    />
                    <span></span>
                </label>
            )}

        </div>
    );
}

export default Settings;