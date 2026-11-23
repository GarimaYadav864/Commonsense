import "../App.css";

import {
  ArrowRight,
  ArrowUpRight,
  HandHeart,
  Package,
  Users,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  Sprout,
  Truck,
  Menu,
  X,
} from "lucide-react";

import { useState } from "react";
import { Link } from "react-router-dom";


const steps = [
  {
    number: "01",
    icon: HandHeart,
    title: "Share a Need",
    description:
      "Describe the resources you need, the quantity, urgency and location.",
  },
  {
    number: "02",
    icon: Sprout,
    title: "Find the Right Match",
    description:
      "Our intelligent matching engine identifies suitable available resources.",
  },
  {
    number: "03",
    icon: HeartHandshake,
    title: "Connect & Confirm",
    description:
      "Requesters and providers coordinate and confirm the allocation.",
  },
  {
    number: "04",
    icon: Truck,
    title: "Complete the Handover",
    description:
      "Coordinate collection or delivery and track the handover process.",
  },
];

const values = [
  {
    icon: Users,
    title: "Community First",
    description:
      "Building meaningful connections between people who have resources and those who need them.",
  },
  {
    icon: ShieldCheck,
    title: "Transparent Coordination",
    description:
      "Clear requests, provider confirmations and traceable resource allocation.",
  },
  {
    icon: MapPin,
    title: "Local Impact",
    description:
      "Prioritising nearby resources to make community support more accessible.",
  },
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <nav className="navbar">
        <a href="#home" className="brand" onClick={closeMenu}>
          <img
            src="/commonsense-logo.png"
            alt="Commonsense logo"
            className="brand-logo"
          />
          <span>Commonsense</span>
        </a>

        <button
          className="mobile-menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <div className={`nav-links ${menuOpen ? "nav-open" : ""}`}>
          <a href="#home" onClick={closeMenu}>Home</a>
          <a href="#how-it-works" onClick={closeMenu}>How It Works</a>
          <a href="#about" onClick={closeMenu}>About Us</a>
          <a href="#contact" onClick={closeMenu}>Contact</a>
          <Link to="/login" onClick={closeMenu}>
            Login
          </Link>

          <Link
            to="/register"
            className="nav-cta"
            onClick={closeMenu}
          >
            Get Started <ArrowUpRight size={16} />
          </Link>
        </div>
      </nav>

      <section className="hero" id="home">
        <div className="hero-content">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            A BETTER WAY TO HELP EACH OTHER
          </span>

          <h1>
            Resources are
            <br />
            better when they
            <br />
            <span>reach the right hands.</span>
          </h1>

          <p className="hero-description">
            Connecting community needs with available resources through
            intelligent matching, local collaboration and meaningful action.
          </p>

          <div className="hero-actions">
            <Link to="/register" className="button button-primary">
              Make a Difference <ArrowRight size={18} />
            </Link>

            <a href="#how-it-works" className="button button-secondary">
              Discover How It Works
            </a>
          </div>

          <div className="hero-note">
            <HeartHandshake size={19} />
            <span>One community. Shared resources. Greater impact.</span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-image-frame">
            <img
              src="/commonsense-logo.png"
              alt="Commonsense community network illustration"
              className="hero-logo"
            />
          </div>
          <div className="floating-note note-one">
            <span className="note-icon"><HandHeart size={19} /></span>
            <span>
              <strong>Need something?</strong>
              <small>Find support nearby</small>
            </span>
          </div>
          <div className="floating-note note-two">
            <span className="note-icon gold-note"><Package size={19} /></span>
            <span>
              <strong>Have something to share?</strong>
              <small>Put resources to good use</small>
            </span>
          </div>
        </div>

        <div className="hero-bottom">
          <span>BUILT AROUND PEOPLE</span>
          <span className="hero-bottom-line" />
          <span>POWERED BY COLLABORATION</span>
          <span className="hero-bottom-line" />
          <span>DRIVEN BY IMPACT</span>
        </div>
      </section>

      <section className="intro-section" id="about">
        <div className="section-heading">
          <span className="eyebrow">THE IDEA BEHIND COMMONSENSE</span>
          <h2>
            Because having resources
            <br />
            <span>isn't enough.</span>
          </h2>
          <p>
            Communities often have resources available while people nearby
            struggle to access them. Commonsense bridges this gap by creating
            a smarter way to discover, match and coordinate resources.
          </p>
        </div>

        <div className="value-grid">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <article className="value-card" key={value.title}>
                <div className="value-icon">
                  <Icon size={25} />
                </div>
                <h3>{value.title}</h3>
                <p>{value.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="process-section" id="how-it-works">
        <div className="process-heading">
          <span className="eyebrow">SIMPLE. CONNECTED. MEANINGFUL.</span>
          <h2>How Commonsense works</h2>
          <p>
            From identifying a need to completing a resource handover,
            every step is designed to make community collaboration easier.
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <article className="step-card" key={step.number}>
                <div className="step-top">
                  <span>{step.number}</span>
                  <Icon size={26} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="join-section" id="get-started">
        <div className="join-content">
          <span className="eyebrow">EVERY CONTRIBUTION COUNTS</span>
          <h2>
            A stronger community
            <br />
            starts with <span>one connection.</span>
          </h2>
          <p>
            Whether you need support or have resources to share,
            there's a place for you in Commonsense.
          </p>

          <div className="join-actions">
            <Link to="/register" className="button button-light">
              I Need Resources <ArrowRight size={17} />
            </Link>

            <Link to="/register" className="button button-outline">
              I Have Resources <ArrowRight size={17} />
            </Link>
          </div>
        </div>
        <div className="join-decoration">
          <Sprout size={150} strokeWidth={0.8} />
        </div>
      </section>

      <footer className="footer" id="contact">
        <div className="footer-main">
          <div className="footer-brand">
            <img src="/commonsense-logo.png" alt="" />
            <div>
              <strong>Commonsense</strong>
              <p>A Community Needs and Resource Matching Engine</p>
            </div>
          </div>
          <p className="footer-message">
            Making resources accessible. Making communities stronger.
          </p>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Commonsense. All rights reserved.</span>
          <span>Made for communities, powered by collaboration.</span>
        </div>
      </footer>
    </main>
  );
}

export default App;
