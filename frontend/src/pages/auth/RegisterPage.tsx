
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  HandHeart,
  Package,
  Truck,
  ShieldCheck,
} from "lucide-react";
import {
  useAuth,
  type PublicUserRole,
} from "../../context/AuthContext";
import "./Auth.css";

const roles = [
  {
    id: "requester",
    title: "Requester",
    description: "I need resources or community support.",
    icon: HandHeart,
  },
  {
    id: "provider",
    title: "Provider",
    description: "I have resources to contribute.",
    icon: Package,
  },
  {
    id: "volunteer",
    title: "Volunteer",
    description: "I want to help with delivery and coordination.",
    icon: Truck,
  },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [role, setRole] = useState<PublicUserRole>("requester");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    location: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const registeredUser = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        location: form.location,
        role,
      });

      navigate(`/${registeredUser.role}/dashboard`, {
        replace: true,
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to create your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <header className="register-header">
        <Link to="/" className="auth-brand">
          <img src="/commonsense-logo.png" alt="Commonsense" />
        </Link>

        <p>
          Already a member? <Link to="/login">Sign in</Link>
        </p>
      </header>

      <main className="register-container">
        <div className="register-heading">
          <span className="auth-eyebrow">
            BE PART OF SOMETHING MEANINGFUL
          </span>
          <h1>Create your account.</h1>
          <p>
            Join a community where resources find the people who need them.
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <h3>How would you like to participate?</h3>
          <p className="register-hint">
            Choose the role that best describes you.
          </p>

          <div className="role-grid">
            {roles.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`role-card ${
                    role === item.id ? "selected" : ""
                  }`}
                  onClick={() => setRole(item.id)}
                  aria-pressed={role === item.id}
                >
                  <Icon size={25} />
                  <strong>{item.title}</strong>
                  <span>{item.description}</span>
                </button>
              );
            })}
          </div>

          <div className="register-fields">
            <div>
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor="location">Location</label>
              <input
                id="location"
                placeholder="City or area"
                value={form.location}
                onChange={(e) => updateField("location", e.target.value)}
                autoComplete="address-level2"
                required
              />
            </div>

            <div>
              <label htmlFor="register-password">Password</label>
              <div className="register-password-wrap">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
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
            </div>

            <div>
              <label htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={(e) =>
                  updateField("confirmPassword", e.target.value)
                }
                autoComplete="new-password"
                required
              />
            </div>
          </div>

          <div className="register-security">
            <ShieldCheck size={19} />
            Your account details will be securely managed.
          </div>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
            {!loading && <ArrowRight size={18} />}
          </button>

          <p className="register-terms">
            By creating an account, you agree to our Terms of Service
            and Privacy Policy.
          </p>
        </form>
      </main>
    </div>
  );
}
