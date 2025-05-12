import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Loading from './Loading';
import './Home.css';

function Home() {
  const [loading, setLoading] = useState(true);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setLoading(false);
      setTimeout(() => setPageLoaded(true), 100); // Small delay for smooth effect
    }, 2000);
  }, []);

  if (loading) {
    return <Loading />;
  }

  return (
    <div className={`landing-page ${pageLoaded ? "page-enter" : ""}`}>
      <header className={`fade-in ${pageLoaded ? "navbar-fade-in" : ""}`}>
        <Navbar />
        <h1 className="tagline">Safe. Secure. Sustainable.</h1>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <h2>Advanced Nuclear Waste Management</h2>
            <p>Efficient, traceable, and secure disposal using cutting-edge technology.</p>
            <a href="/FR" className="cta-button hover-glow">Register Facility</a>
          </div>
        </section>

        <section className="info fade-in">
          <h3>Why Us?</h3>
          <p>AI-powered tracking & blockchain security to ensure complete transparency in nuclear waste management.</p>
        </section>
      </main>
    </div>
  );
}

export default Home;
