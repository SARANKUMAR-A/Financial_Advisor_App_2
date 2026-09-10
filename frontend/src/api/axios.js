import axios from "axios";

const API = axios.create({
    baseURL: "http://127.0.0.1:8000/",
});


// ==========================================
// REQUEST INTERCEPTOR
// ==========================================

API.interceptors.request.use(
    (config) => {

        const token =
            sessionStorage.getItem("access_token");

        console.log(
            "Axios Access Token:",
            token
        );

        if (token) {

            config.headers = config.headers || {};

            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


// ==========================================
// RESPONSE INTERCEPTOR
// ==========================================

API.interceptors.response.use(

    (response) => {
        return response;
    },

    async (error) => {

        const originalRequest = error.config;

        /*
         * Prevent interceptor problems when
         * login or refresh itself fails.
         */
        if (
            originalRequest &&
            (
                originalRequest.url?.includes("login/") ||
                originalRequest.url?.includes("token/refresh/")
            )
        ) {
            return Promise.reject(error);
        }


        /*
         * Access token expired
         */
        if (
            error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry
        ) {

            originalRequest._retry = true;

            const refreshToken =
                sessionStorage.getItem(
                    "refresh_token"
                );


            /*
             * Refresh token doesn't exist
             */
            if (!refreshToken) {

                console.log(
                    "Refresh token missing."
                );

                sessionStorage.clear();

                window.location.href =
                    "/login";

                return Promise.reject(error);
            }


            try {

                console.log(
                    "Refreshing access token..."
                );


                /*
                 * IMPORTANT:
                 *
                 * Change this URL if your Django
                 * refresh endpoint is different.
                 */
                const response = await axios.post(
                    "http://127.0.0.1:8000/fin-ai/token/refresh/",
                    {
                        refresh: refreshToken,
                    }
                );


                const newAccessToken =
                    response.data.access;


                if (!newAccessToken) {

                    throw new Error(
                        "New access token was not returned."
                    );
                }


                /*
                 * Save NEW token
                 */
                sessionStorage.setItem(
                    "access_token",
                    newAccessToken
                );


                console.log(
                    "New access token saved."
                );


                /*
                 * Update original request
                 */
                originalRequest.headers =
                    originalRequest.headers || {};

                originalRequest.headers.Authorization =
                    `Bearer ${newAccessToken}`;


                /*
                 * Retry request
                 */
                return API(originalRequest);

            } catch (refreshError) {

                console.error(
                    "Token refresh failed:",
                    refreshError
                );

                sessionStorage.clear();

                window.location.href =
                    "/login";

                return Promise.reject(
                    refreshError
                );
            }
        }


        return Promise.reject(error);
    }
);


export default API;