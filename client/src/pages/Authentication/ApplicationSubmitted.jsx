import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .as-root {
    min-height: 100vh;
    background: #f7f5f2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    padding: 24px;
    position: relative;
    overflow: hidden;
  }

  .as-bg-blob {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.18;
    pointer-events: none;
  }
  .as-bg-blob-1 {
    width: 500px; height: 500px;
    background: #f0a500;
    top: -120px; right: -100px;
  }
  .as-bg-blob-2 {
    width: 350px; height: 350px;
    background: #3dbe6e;
    bottom: -80px; left: -60px;
  }

  .as-card {
    background: #ffffff;
    border-radius: 28px;
    box-shadow: 0 8px 48px rgba(0,0,0,0.10), 0 1.5px 6px rgba(0,0,0,0.05);
    max-width: 520px;
    width: 100%;
    padding: 56px 48px 48px;
    text-align: center;
    position: relative;
    z-index: 1;
    animation: cardIn 0.7s cubic-bezier(.22,1,.36,1) both;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(36px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }

  .as-icon-wrap {
    width: 88px; height: 88px;
    background: #fff7e6;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 28px;
    animation: iconPop 0.6s 0.3s cubic-bezier(.22,1,.36,1) both;
  }

  @keyframes iconPop {
    from { opacity: 0; transform: scale(0.5); }
    to   { opacity: 1; transform: scale(1); }
  }

  .as-clock-svg {
    width: 44px; height: 44px;
  }

  .as-title {
    font-family: 'Sora', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #1a1a1a;
    margin-bottom: 14px;
    letter-spacing: -0.5px;
    animation: fadeUp 0.6s 0.4s both;
  }

  .as-subtitle {
    font-size: 15.5px;
    color: #5a5a5a;
    line-height: 1.65;
    margin-bottom: 32px;
    animation: fadeUp 0.6s 0.5s both;
  }

  .as-subtitle strong {
    color: #1a1a1a;
    font-weight: 600;
  }

  .as-box {
    background: #f9f8f6;
    border: 1.5px solid #ede9e2;
    border-radius: 18px;
    padding: 28px 28px 24px;
    text-align: left;
    margin-bottom: 36px;
    animation: fadeUp 0.6s 0.6s both;
  }

  .as-box-title {
    font-family: 'Sora', sans-serif;
    font-size: 14px;
    font-weight: 600;
    color: #1a1a1a;
    margin-bottom: 16px;
    letter-spacing: 0.2px;
  }

  .as-steps {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .as-step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    font-size: 14.5px;
    color: #3d3d3d;
    line-height: 1.5;
    opacity: 0;
    animation: fadeUp 0.5s forwards;
  }
  .as-step:nth-child(1) { animation-delay: 0.75s; }
  .as-step:nth-child(2) { animation-delay: 0.88s; }
  .as-step:nth-child(3) { animation-delay: 1.01s; }

  .as-step-dot {
    flex-shrink: 0;
    margin-top: 4px;
    width: 20px; height: 20px;
    border-radius: 50%;
    background: #fff7e6;
    border: 2px solid #f0a500;
    display: flex; align-items: center; justify-content: center;
  }
  .as-step-dot svg { width: 10px; height: 10px; }

  .as-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: #3dbe6e;
    color: #fff;
    font-family: 'Sora', sans-serif;
    font-size: 15px;
    font-weight: 600;
    padding: 15px 40px;
    border-radius: 50px;
    border: none;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 18px rgba(61,190,110,0.28);
    animation: fadeUp 0.6s 1.1s both;
  }
  .as-btn:hover {
    background: #34a85f;
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(61,190,110,0.35);
  }
  .as-btn:active { transform: translateY(0); }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* clock hand animation */
  @keyframes tickMin {
    0%   { transform: rotate(0deg);   transform-origin: 50% 75%; }
    100% { transform: rotate(360deg); transform-origin: 50% 75%; }
  }
  .as-clock-min {
    animation: tickMin 6s linear infinite;
    transform-origin: 12px 18px;
  }
`;

export default function ApplicationSubmitted() {
  const [mounted, setMounted] = useState(false);
  const location = useLocation();
  const orgName = location.state?.orgName || 'your organization';
  useEffect(() => { setMounted(true); }, []);

  return (
    <>
      <style>{style}</style>
      <div className="as-root">
        {/* background blobs */}
        <div className="as-bg-blob as-bg-blob-1" />
        <div className="as-bg-blob as-bg-blob-2" />

        <div className="as-card">
          {/* Clock icon */}
          <div className="as-icon-wrap">
            <svg className="as-clock-svg" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="17" stroke="#f0a500" strokeWidth="2.5" fill="#fff7e6"/>
              <line x1="20" y1="11" x2="20" y2="20" stroke="#f0a500" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="20" y1="20" x2="27" y2="25" stroke="#f0a500" strokeWidth="2.5" strokeLinecap="round" className="as-clock-min"/>
              <circle cx="20" cy="20" r="2" fill="#f0a500"/>
            </svg>
          </div>

          <h1 className="as-title">Application Submitted</h1>

          <p className="as-subtitle">
            Thank you for registering <strong>{orgName}</strong>. Your provider account is
            currently pending review by our compliance team.
          </p>

          {/* What's next box */}
          <div className="as-box">
            <p className="as-box-title">What's next?</p>
            <ul className="as-steps">
              <li className="as-step">
                <span className="as-step-dot">
                  <svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#f0a500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                Our SuperAdmin will review your compliance documents.
              </li>
              <li className="as-step">
                <span className="as-step-dot">
                  <svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#f0a500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                You will be notified once your account is activated.
              </li>
              <li className="as-step">
                <span className="as-step-dot">
                  <svg viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#f0a500" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                Once approved, you can log in and start receiving service requests.
              </li>
            </ul>
          </div>

          {/* CTA */}
          <a href="/login" className="as-btn">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 8H3M6 5l-3 3 3 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 3h4a1 1 0 011 1v8a1 1 0 01-1 1H8" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            Return to Login
          </a>
        </div>
      </div>
    </>
  );
}