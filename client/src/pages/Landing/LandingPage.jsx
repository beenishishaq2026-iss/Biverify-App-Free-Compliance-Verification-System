// LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  return (
    <div className="landing-wrapper">
      <div className="landing-container">

        <main className="landing-main-content">
          <div className="text-section">
            <h1 className="main-title">
              <span className="green-text">Bi-Verify</span><br />
              Compliance verification System
            </h1>
            <p className="description">
              Securely verify outsourced services with our app-free dual QR validation mechanism. Ensuring transparency and preventing fraud between organizations and providers, all through a web platform.
            </p>
            <button className="Login-btn" onClick={() => navigate('/login')}>Sign in</button>
            <button className="Signup-btn" onClick={() => navigate('/signup')}>Sign up</button>

            <div className="social-links">
              <span className="follow-text">FOLLOW</span>
              <a href="#f" className="icon" title="Facebook">f</a>
              <a href="#t" className="icon" title="Twitter">y</a>
              <a href="#i" className="icon" title="Instagram">o</a>
            </div>
          </div>

          <div className="image-section">
            {/* The actual image path can be replaced with your own asset, e.g., the generated illustration */}
            <img src="/isometric_qr_scanner_1772624701087.png" alt="3D isometric QR scanning phone" className="hero-img" />
          </div>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;