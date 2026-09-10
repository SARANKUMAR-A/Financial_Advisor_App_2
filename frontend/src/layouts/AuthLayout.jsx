function AuthLayout({ children }) {
  return (
    <div className="auth-page">

      {/* Left Side - Image */}
      <div className="auth-image-section">
        <img
          src="/Login_Image.jpg"
          alt="Financial Application"
          className="auth-image"
        />
      </div>

      {/* Right Side - Login / Signup Form */}
      <div className="auth-form-section">
        <div className="auth-form-wrapper">
          {children}
        </div>
      </div>

    </div>
  );
}