import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute() {
    const location = useLocation();

    const accessToken =
        sessionStorage.getItem("access_token");

    console.log(
        "ProtectedRoute - Access Token:",
        accessToken
    );

    /*
     * No access token
     * → Redirect to login
     */
    if (!accessToken) {

        console.log(
            "ProtectedRoute: No token. Redirecting to login."
        );

        return (
            <Navigate
                to="/login"
                replace
                state={{
                    from: location
                }}
            />
        );
    }

    /*
     * Access token exists
     * → Allow access to protected page
     */
    console.log(
        "ProtectedRoute: Token found. Allowing access."
    );

    return <Outlet />;
}

export default ProtectedRoute;