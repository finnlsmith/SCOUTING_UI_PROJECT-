import React from "react";

export default function TutorialPage() {
  const page = {
    maxWidth: 980,
    margin: "0 auto",
    padding: "60px 24px 90px",
    color: "var(--color-text-primary)",
    textAlign: "left", // ✅ force left alignment
  };

  const header = {
    marginBottom: 28,
  };

  const subtitle = {
    color: "var(--color-text-secondary)",
    marginTop: 10,
    lineHeight: 1.6,
  };

  const section = {
    background: "var(--color-bg-secondary)",
    border: "1px solid var(--color-border-medium)",
    borderRadius: 14,
    padding: "18px 22px",
    marginBottom: 16,
  };

  const h2 = {
    margin: "0 0 10px",
    fontSize: 18,
  };

  const h3 = {
    margin: "14px 0 8px",
    fontSize: 16,
  };

  const p = {
    margin: "8px 0 0",
    color: "var(--color-text-secondary)",
    lineHeight: 1.7,
  };

  const ul = {
    margin: "10px 0 0",
    paddingLeft: 22,
    lineHeight: 1.8,
  };

  const ol = {
    margin: "10px 0 0",
    paddingLeft: 22,
    lineHeight: 1.9,
  };

  const codeInline = {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 13,
    padding: "2px 6px",
    borderRadius: 8,
    background: "var(--color-bg-primary)",
    border: "1px solid var(--color-border-medium)",
    color: "var(--color-text-primary)",
  };

  return (
    <div style={page}>
      {/* Title */}
      <div style={header}>
        <h1 style={{ margin: 0 }}>Tutorial</h1>
        <p style={subtitle}>
          Notes and best practices for working with StatsBomb-style event data and Frames_360.
        </p>
      </div>

      <section style={section}>
        <h2 style={h2}>Working with StatsBomb Event &amp; Frames_360</h2>
        <p style={p}>
          This guide summarizes common setup steps, visualization gotchas, and data quirks you may run
          into when using your own dataset.
        </p>
      </section>

      <section style={section}>
        <h2 style={h2}>Helpful Guides to Get Started</h2>
        <ul style={ul}>
          <li><strong>Uppsala class materials</strong> (event data walkthroughs)</li>
          <li><strong>Opta / StatsBomb tutorials and data dictionaries</strong></li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Key Things to Know When Working with Your Own Dataset</h2>

        <h3 style={h3}>Startup for easier use</h3>
        <ul style={ul}>
          <li>
            Sort events by <code style={codeInline}>period</code>,{" "}
            <code style={codeInline}>minute</code>,{" "}
            <code style={codeInline}>second</code>,{" "}
            <code style={codeInline}>possession</code>.
          </li>
          <li>
            Ensure <code style={codeInline}>Carry</code> occurs after{" "}
            <code style={codeInline}>Ball Receipt*</code> for same-player events within ~1s.
          </li>
          <li>
            Parse X/Y from <code style={codeInline}>location</code>,{" "}
            <code style={codeInline}>pass_end_location</code>,{" "}
            <code style={codeInline}>carry_end_location</code>.
          </li>
          <li>Reorder columns to make the dataset readable.</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Things to Keep In Mind</h2>

        <h3 style={h3}>Attacking direction</h3>
        <ul style={ul}>
          <li>Both teams attack in the same direction in raw data.</li>
          <li>You must flip one team’s X and Y when visualizing.</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>What You Can and Can’t Do</h2>

        <h3 style={h3}>You can</h3>
        <ul style={ul}>
          <li>See where players are at the moment an event occurs.</li>
        </ul>

        <h3 style={h3}>You can’t</h3>
        <ul style={ul}>
          <li>See player movement between events.</li>
          <li>For that, you need interpolation libraries.</li>
        </ul>
      </section>

      <section style={section}>
        <h2 style={h2}>Common Quirks &amp; Small Bugs</h2>
        <ul style={ul}>
          <li>Carry actions may appear discontinuous.</li>
          <li>Some actions lack Ball Receipt events.</li>
          <li>Event timing and locations may be slightly out of sync.</li>
        </ul>
      </section>
    </div>
  );
}
