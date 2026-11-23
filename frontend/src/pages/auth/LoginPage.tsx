
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const loggedInUser = await login(email, password);

      navigate(`/${loggedInUser.role}/dashboard`, {
        replace: true,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to sign in. Please try again."
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
          <span className="auth-eyebrow">WELCOME BACK</span>
          <h1>
            Together, we can
            <br />
            make resources
            <br />
            <span>reach further.</span>
          </h1>
          <p>
            Every connection creates an opportunity.
            Continue being a part of a community that shares and cares.
          </p>
        </div>

        <span className="auth-brand-footer">
          A Community Needs and Resource Matching Engine
        </span>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-container">
          <Link to="/" className="auth-mobile-logo">
            <img src="/commonsense-logo.png" alt="Commonsense" />
          </Link>

          <span className="auth-eyebrow">YOUR COMMUNITY AWAITS</span>
          <h2>Welcome back.</h2>
          <p className="auth-subtitle">
            Sign in to continue to your Commonsense account.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="email">Email address</label>
            <div className="auth-input-wrap">
              <Mail size={18} />
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <label htmlFor="password">Password</label>
            <div className="auth-input-wrap">
              <LockKeyhole size={18} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <div className="auth-forgot">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-divider">
            <span>NEW TO COMMONSENSE?</span>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>

          <Link to="/" className="auth-back">
            ← Back to homepage
          </Link>
        </div>
      </section>
    </div>
  );
}
