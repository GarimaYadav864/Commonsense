import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, LockKeyhole, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import "./Auth.css";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    try {
      setLoading(true);
      await api.post("/auth/reset-password", { token, password });
      setSuccess(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "This reset link is invalid or has expired. Please request a new one."
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
          <span className="auth-eyebrow">SECURE YOUR ACCOUNT</span>
          <h1>A fresh start, <span>one step</span> away.</h1>
          <p>Choose a strong password to continue making a difference in your community.</p>
        </div>
        <span className="auth-brand-footer">A Community Needs and Resource Matching Engine</span>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-container">
          <Link to="/" className="auth-mobile-logo">
            <img src="/commonsense-logo.png" alt="Commonsense" />
          </Link>
          {success ? (
            <div className="auth-success-state">
              <CheckCircle2 size={42} />
              <span className="auth-eyebrow">PASSWORD UPDATED</span>
              <h2>You're all set.</h2>
              <p className="auth-subtitle">Your password has been changed successfully. Sign in with your new password.</p>
              <button className="auth-submit" onClick={() => navigate("/login", { replace: true })}>Go to Sign In <ArrowRight size={18} /></button>
            </div>
          ) : (
            <>
              <span className="auth-eyebrow">CREATE A NEW PASSWORD</span>
              <h2>Reset password.</h2>
              <p className="auth-subtitle">Choose a new password with at least 8 characters.</p>
              {!token && <p className="auth-error" role="alert">This reset link is missing its token. Please request a new link.</p>}
              <form onSubmit={handleSubmit}>
                <label htmlFor="new-password">New password</label>
                <div className="auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input id="new-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
                <label htmlFor="confirm-new-password">Confirm new password</label>
                <div className="auth-input-wrap">
                  <LockKeyhole size={18} />
                  <input id="confirm-new-password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
                </div>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button type="submit" className="auth-submit" disabled={loading || !token}>
                  {loading ? "Updating password..." : "Update password"}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </form>
              <Link to="/forgot-password" className="auth-back">Request a new reset link</Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
