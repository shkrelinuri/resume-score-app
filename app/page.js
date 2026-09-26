"use client";

import { useEffect, useRef, useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [targetRole, setTargetRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const [licenseKey, setLicenseKey] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const resultsRef = useRef(null);

  useEffect(() => {
    if (result) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a resume file first.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    setUnlocked(false);

    if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      setResult({
        overallScore: 54,
        verdict: "Promising, but not interview-ready",
        summary: "The structure is usable, but the resume is not proving enough impact yet. Stronger metrics, sharper bullets, and closer keyword alignment would materially improve it.",
        categories: [
          { name: "ATS Compatibility", score: 68 },
          { name: "Quantified Impact", score: 42 },
          { name: "Clarity", score: 61 },
          { name: "Keyword Match", score: targetRole ? 58 : 49 },
        ],
      });
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("targetRole", targetRole);
      formData.append("jobDescription", jobDescription);

      const res = await fetch("/api/score", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Scoring failed with status ${res.status}.`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function resetScan() {
    setFile(null);
    setTargetRole("");
    setJobDescription("");
    setResult(null);
    setError("");
    setUnlocked(false);
    setLicenseKey("");
  }

  async function handleVerifyLicense(e) {
    e.preventDefault();
    setLicenseError("");
    setVerifying(true);
    try {
      const res = await fetch("/api/verify-license", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ licenseKey }),
      });
      const data = await res.json();
      if (data.valid) {
        if (!file) {
          throw new Error("Please run a score before unlocking the report.");
        }

        const formData = new FormData();
        formData.append("resume", file);
        formData.append("targetRole", targetRole);
        formData.append("jobDescription", jobDescription);
        formData.append("licenseKey", licenseKey);

        const reportRes = await fetch("/api/score", {
          method: "POST",
          body: formData,
        });
        const reportData = await reportRes.json().catch(() => ({}));
        if (!reportRes.ok) {
          throw new Error(reportData.error || "Could not unlock the full report.");
        }

        setResult(reportData);
        setUnlocked(true);
      } else {
        setLicenseError("That license key didn't verify. Double check it and try again.");
      }
    } catch (err) {
      setLicenseError(err.message || "Couldn't verify right now — please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <main className="site-shell">
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="Hireability Score home">
          <span className="brand-mark">H</span>
          <span>Hireability<span className="brand-dot">.</span></span>
        </a>
        <div className="nav-note"><span className="status-dot" /> Resume intelligence for your next move</div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Resume clarity, measured</p>
          <h1>Make your resume easier to <em>say yes</em> to.</h1>
          <p className="sub">
            Get a fast, honest read on the four signals recruiters and ATS systems look for first.
          </p>
          <div className="proof-row">
            <div className="proof-avatars"><span>JR</span><span>MK</span><span>AL</span></div>
            <p><strong>2,400+ resumes</strong><br />reviewed this month</p>
          </div>
        </div>
        <div className="hero-aside">
          <div className="signal-card">
            <div className="signal-top"><span>THE SIGNALS</span><span>01—04</span></div>
            <div className="signal-list">
              <div><span className="signal-index">01</span><span>ATS compatibility</span><b>Readable</b></div>
              <div><span className="signal-index">02</span><span>Quantified impact</span><b>Specific</b></div>
              <div><span className="signal-index">03</span><span>Clarity</span><b>Concise</b></div>
              <div><span className="signal-index">04</span><span>Keyword match</span><b>Relevant</b></div>
            </div>
          </div>
        </div>
      </section>

      <section className="workspace-grid" aria-label="Resume scorer">
        <form className="card intake-card" onSubmit={handleSubmit}>
          <div className="card-heading">
            <div><p className="section-kicker">01 / START HERE</p><h2>Bring your resume.</h2></div>
            <span className="free-badge">Free score</span>
          </div>
          <p className="card-intro">One PDF. About 30 seconds. No account or email required.</p>

          <label className={`dropzone ${file ? "has-file" : ""}`} htmlFor="resume-file">
            <input id="resume-file" type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
            <span className="upload-icon">↑</span>
            <span className="drop-title">{file ? file.name : "Drop your PDF here"}</span>
            <span className="drop-helper">{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : "or click to browse · PDF only"}</span>
          </label>

          <label className="field-label" htmlFor="target-role">What role are you targeting? <span>Optional</span></label>
          <input id="target-role" type="text" placeholder="e.g. Product Marketing Manager" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
          <div className="role-suggestions" aria-label="Suggested roles">
            {['Product Manager', 'Software Engineer', 'Marketing Manager'].map((role) => (
              <button className="suggestion-chip" type="button" key={role} onClick={() => setTargetRole(role)}>{role}</button>
            ))}
          </div>

          <label className="field-label" htmlFor="job-description">Paste the job description <span>Optional, improves keyword match</span></label>
          <textarea id="job-description" className="job-description" rows="4" placeholder="Paste the listing here for a more targeted comparison..." value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />

          <button className="primary-button" type="submit" disabled={loading}>
            <span>{loading ? "Reading your resume..." : "Get my free score"}</span><span className="button-arrow">→</span>
          </button>
          {error && <div className="error" role="alert">{error}</div>}
          <p className="privacy-note"><span>✦</span> Your resume is processed privately and never published.</p>
        </form>

        <aside className="side-panel">
          <p className="section-kicker">WHAT YOU GET</p>
          <h2>A sharper first impression.</h2>
          <div className="benefit-list">
            <div><span>01</span><p><strong>A score you can act on</strong><br />A clear benchmark across the signals that matter.</p></div>
            <div><span>02</span><p><strong>Specific, not vague</strong><br />Suggestions grounded in the words on your page.</p></div>
            <div><span>03</span><p><strong>Built for real applications</strong><br />See where an ATS or busy recruiter may hesitate.</p></div>
          </div>
          <div className="side-footer"><span>Designed for job seekers</span><span>2026</span></div>
        </aside>
      </section>

      {result && (
        <section ref={resultsRef} className="results-section" aria-live="polite">
          <div className="results-header"><div><p className="section-kicker">YOUR READOUT</p><h2>The first impression, quantified.</h2></div><div className="result-actions"><span className="result-role">{targetRole || "General application"}</span><button className="reset-button" type="button" onClick={resetScan}>New scan <span>↗</span></button></div></div>
          <div className="result-grid">
            <div className="card score-card">
              <div className="score-row">
              <div
                className="ring"
                style={{
                  background: `conic-gradient(var(--good) ${
                    (result.overallScore / 100) * 360
                  }deg, var(--line) 0deg)`,
                }}
              >
                <div className="inner">{result.overallScore}</div>
              </div>
              </div>
              <div className="score-meta"><span>OVERALL SCORE</span><strong>{result.overallScore}<small>/100</small></strong><p>{result.verdict}</p></div>
              <p className="ai-summary">{result.summary || "Your resume has been reviewed across structure, impact, clarity, and relevance."}</p>
            </div>

            <div className={`card breakdown-card ${unlocked ? "" : "locked"}`}>
              <div className="breakdown-heading"><h3>Signal breakdown</h3><span>Score / 100</span></div>
              {result.categories.map((c) => (
                <div className="cat" key={c.name}><div className="cat-label"><span>{c.name}</span><span>{c.score}</span></div><div className="progress-track"><div className="progress-bar" style={{ width: `${c.score}%` }} /></div></div>
              ))}
            </div>
          </div>

          {!unlocked && (
            <div className="card unlock-box">
              <div><p className="section-kicker">TAKE THE NEXT STEP</p><h3>Turn the score into an interview.</h3><p className="muted">Unlock rewrite suggestions, keyword gaps, and the complete report for $10.</p></div>
              <div className="unlock-action">
              <a
                className="btn-link"
                href="https://gumroad.com/l/YOUR_PRODUCT_PERMALINK"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buy full report <span>→</span>
              </a>

              <form onSubmit={handleVerifyLicense}>
                <input
                  type="text"
                  placeholder="Paste your license key"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                />
                <button className="secondary-button" type="submit" disabled={verifying || !licenseKey}>
                  {verifying ? "Verifying..." : "I have a license key"}
                </button>
                {licenseError && <div className="error">{licenseError}</div>}
              </form>
              </div>
            </div>
          )}
          {unlocked && <div className="card unlocked-report"><p className="section-kicker">FULL REPORT UNLOCKED</p><h3>Rewrite suggestions</h3><ul>{result.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul></div>}
        </section>
      )}
    </main>
  );
}
