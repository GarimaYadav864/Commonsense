import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import "./Auth.css";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "We couldn't process your request right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-brand-panel">
        <Link to="/" className="auth-brand">
          <img src="/commonsense-logo.png" alt="Commonsense" />
        </Link>
        <div className="auth-brand-content">
          <span className="auth-eyebrow">ACCOUNT RECOVERY</span>
          <h1>Every good connection starts with <span>trust.</span></h1>
          <p>We'll help you securely get back to your Commonsense community.</p>
        </div>
        <span className="auth-brand-footer">A Community Needs and Resource Matching Engine</span>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <Link to="/" className="auth-mobile-logo">
            <img src="/commonsense-logo.png" alt="Commonsense" />
          </Link>
          {submitted ? (
            <div className="auth-success-state">
              <CheckCircle2 size={42} />
              <span className="auth-eyebrow">CHECK YOUR INBOX</span>
              <h2>Check your email.</h2>
              <p className="auth-subtitle">
                If an account exists for <strong>{email}</strong>, you'll receive a password reset link shortly. The link expires in 15 minutes.
              </p>
              <Link to="/login" className="auth-submit auth-submit-link">Back to Sign In</Link>
            </div>
          ) : (
            <>
              <span className="auth-eyebrow">PASSWORD RECOVERY</span>
              <h2>Forgot password?</h2>
              <p className="auth-subtitle">Enter the email address associated with your account and we'll send you a reset link.</p>
              <form onSubmit={handleSubmit}>
                <label htmlFor="recovery-email">Email address</label>
                <div className="auth-input-wrap">
                  <Mail size={18} />
                  <input
                    id="recovery-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? "Sending link..." : "Send reset link"}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
              <Link to="/login" className="auth-back auth-back-with-icon"><ArrowLeft size={15} /> Back to Sign In</Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
