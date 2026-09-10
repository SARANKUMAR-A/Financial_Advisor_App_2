import { useEffect, useRef, useState } from "react";
import API from "../api/axios";

function Profile() {

    // ==============================
    // Profile Form Data
    // ==============================
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
    });

    // ==============================
    // Photo State
    // ==============================
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState("");

    // ==============================
    // UI State
    // ==============================
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // File input reference
    const fileInputRef = useRef(null);

    // ==============================
    // Get Profile
    // ==============================
    const getProfile = async () => {

        try {

            setLoading(true);
            setError("");
            setSuccess("");

            const response = await API.get("profile/");

            const user = response.data;

            console.log("Profile response:", user);

            // Set profile information
            setFormData({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                phone: user.phone || "",
            });

            // Set profile photo from database
            if (user.photo) {
                setPhotoPreview(user.photo);
            } else {
                setPhotoPreview("");
            }

        } catch (error) {

            console.error(
                "Get profile error:",
                error.response?.data || error
            );

            if (error.response?.data) {

                const data = error.response.data;

                const messages = Object.values(data)
                    .flat()
                    .join(" ");

                setError(
                    messages || "Unable to load profile."
                );

            } else {

                setError(
                    "Unable to load profile."
                );
            }

        } finally {

            setLoading(false);
        }
    };

    // ==============================
    // Load Profile On Page Load
    // ==============================
    useEffect(() => {

        getProfile();

    }, []);

    // ==============================
    // Handle Text Input Changes
    // ==============================
    const handleChange = (e) => {

        const {
            name,
            value
        } = e.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value,
        }));

        // Clear previous messages
        setError("");
        setSuccess("");
    };

    // ==============================
    // Open File Picker
    // ==============================
    const handleChangePhoto = () => {

        fileInputRef.current?.click();
    };

    // ==============================
    // Handle Photo Selection
    // ==============================
    const handlePhotoChange = (e) => {

        const file = e.target.files?.[0];

        if (!file) {
            return;
        }

        console.log("Selected photo:", file);
        console.log("File name:", file.name);
        console.log("File type:", file.type);
        console.log("File size:", file.size);

        // ==============================
        // Validate File Type
        // ==============================
        if (!file.type.startsWith("image/")) {

            setError(
                "Please select a valid image file."
            );

            return;
        }

        // ==============================
        // Validate File Size
        // Maximum 5 MB
        // ==============================
        if (file.size > 5 * 1024 * 1024) {

            setError(
                "Photo must be less than 5 MB."
            );

            return;
        }

        // Clear messages
        setError("");
        setSuccess("");

        // ==============================
        // IMPORTANT
        // Store the actual File object
        // ==============================
        setPhoto(file);

        // ==============================
        // Create Immediate Preview
        // ==============================
        const previewUrl = URL.createObjectURL(file);

        setPhotoPreview(previewUrl);
    };

    // ==============================
    // Save Profile
    // ==============================
    const handleSave = async () => {

        try {

            setSaving(true);
            setError("");
            setSuccess("");

            // ==============================
            // Create FormData
            // ==============================
            const data = new FormData();

            data.append(
                "first_name",
                formData.first_name
            );

            data.append(
                "last_name",
                formData.last_name
            );

            data.append(
                "email",
                formData.email
            );

            data.append(
                "phone",
                formData.phone
            );

            // ==============================
            // Add Photo
            // ==============================
            if (photo instanceof File) {

                data.append(
                    "photo",
                    photo
                );
            }

            // ==============================
            // Debug FormData
            // ==============================
            console.log(
                "========== PROFILE FORM DATA =========="
            );

            for (const [key, value] of data.entries()) {

                if (value instanceof File) {

                    console.log(
                        `${key}: FILE`,
                        value.name,
                        value.type,
                        value.size
                    );

                } else {

                    console.log(
                        `${key}:`,
                        value
                    );
                }
            }

            console.log(
                "========================================"
            );

            // ==============================
            // Send PATCH Request
            // ==============================
            const response = await API.patch(
                "profile/",
                data
            );

            console.log(
                "Profile update response:",
                response.data
            );

            const user = response.data.user;

            // ==============================
            // Update Form Data
            // ==============================
            setFormData({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
                phone: user.phone || "",
            });

            // ==============================
            // Update Photo Preview
            // ==============================
            if (user.photo) {

                setPhotoPreview(user.photo);

            } else {

                setPhotoPreview("");
            }

            // ==============================
            // Clear Selected File
            // ==============================
            setPhoto(null);

            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            // ==============================
            // Success Message
            // ==============================
            setSuccess(
                response.data.message ||
                "Profile updated successfully."
            );

        } catch (error) {

            console.error(
                "Update profile error:",
                error.response?.data || error
            );

            if (error.response?.data) {

                const data = error.response.data;

                const messages = Object.values(data)
                    .flat()
                    .join(" ");

                setError(
                    messages ||
                    "Unable to update profile."
                );

            } else {

                setError(
                    "Unable to update profile."
                );
            }

        } finally {

            setSaving(false);
        }
    };

    // ==============================
    // Generate Initials
    // ==============================
    const initials = (
        `${formData.first_name?.charAt(0) || ""}${formData.last_name?.charAt(0) || ""}`
    ).toUpperCase();

    // ==============================
    // Full Name
    // ==============================
    const fullName = (
        `${formData.first_name || ""} ${formData.last_name || ""}`
    ).trim();

    // ==============================
    // UI
    // ==============================
    return (
        <div className="page-background">

            {/* =========================================
                PAGE HEADER
            ========================================= */}

            <div className="page-header">

                <div>

                    <small>
                        ACCOUNT
                    </small>

                    <h1>
                        Profile
                    </h1>

                    <p>
                        Manage your personal information.
                    </p>

                </div>

                <button
                    className="primary-button"
                    onClick={handleSave}
                    disabled={loading || saving}
                >

                    {saving
                        ? "Saving..."
                        : "Save Changes"
                    }

                </button>

            </div>


            {/* =========================================
                ERROR MESSAGE
            ========================================= */}

            {error && (

                <div className="error-message">

                    {error}

                </div>

            )}


            {/* =========================================
                SUCCESS MESSAGE
            ========================================= */}

            {success && (

                <div className="success-message">

                    {success}

                </div>

            )}


            {/* =========================================
                PROFILE GRID
            ========================================= */}

            <div className="profile-grid">


                {/* =====================================
                    PROFILE CARD
                ===================================== */}

                <div className="dashboard-card profile-card">


                    {/* =================================
                        LARGE AVATAR
                    ================================= */}

                    <div className="large-avatar">

                        {loading ? (

                            "..."

                        ) : photoPreview ? (

                            <img
                                src={photoPreview}
                                alt="Profile"
                            />

                        ) : (

                            initials || "U"

                        )}

                    </div>


                    {/* =================================
                        USER NAME
                    ================================= */}

                    <h2>

                        {loading
                            ? "Loading..."
                            : fullName || "User"
                        }

                    </h2>


                    {/* =================================
                        USER ROLE
                    ================================= */}

                    <p>
                        Financial Data Analyst
                    </p>


                    {/* =================================
                        CHANGE PHOTO BUTTON
                    ================================= */}

                    <button
                        className="secondary-button"
                        type="button"
                        onClick={handleChangePhoto}
                        disabled={loading || saving}
                    >

                        Change Photo

                    </button>


                    {/* =================================
                        HIDDEN FILE INPUT
                    ================================= */}

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={handlePhotoChange}
                        style={{
                            display: "none"
                        }}
                    />

                </div>


                {/* =====================================
                    PERSONAL INFORMATION CARD
                ===================================== */}

                <div className="dashboard-card">


                    <h3>
                        Personal Information
                    </h3>


                    <div className="form-grid">


                        {/* =================================
                            FIRST NAME
                        ================================= */}

                        <div>

                            <label>
                                First Name
                            </label>

                            <input
                                type="text"
                                name="first_name"
                                value={formData.first_name}
                                onChange={handleChange}
                                disabled={loading || saving}
                                placeholder="First Name"
                            />

                        </div>


                        {/* =================================
                            LAST NAME
                        ================================= */}

                        <div>

                            <label>
                                Last Name
                            </label>

                            <input
                                type="text"
                                name="last_name"
                                value={formData.last_name}
                                onChange={handleChange}
                                disabled={loading || saving}
                                placeholder="Last Name"
                            />

                        </div>


                        {/* =================================
                            EMAIL
                        ================================= */}

                        <div>

                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={loading || saving}
                                placeholder="Email"
                            />

                        </div>


                        {/* =================================
                            PHONE
                        ================================= */}

                        <div>

                            <label>
                                Phone
                            </label>

                            <input
                                type="text"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                disabled={loading || saving}
                                placeholder="+91 98765 43210"
                            />

                        </div>


                    </div>

                </div>

            </div>

        </div>
    );
}

export default Profile;