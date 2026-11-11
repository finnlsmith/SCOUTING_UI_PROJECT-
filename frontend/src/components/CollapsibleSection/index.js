import React, { useState, useId } from "react";
import styles from "./CollapsibleSection.module.css";

/**
 * A titled section that can be collapsed and expanded.
 *
 * Props:
 *  - title:       heading text
 *  - subtitle:    optional small text shown under the title
 *  - headerExtra: optional node shown at the right of the header (e.g. a checkbox).
 *                 It sits outside the toggle button so clicking it does not collapse the section.
 *  - defaultOpen: whether the section starts expanded (default true)
 */
export default function CollapsibleSection({
  title,
  subtitle,
  headerExtra,
  defaultOpen = true,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();

  return (
    <section className={styles.section}>
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setOpen(o => !o)}
        >
          <span className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`} aria-hidden="true">
            ▸
          </span>
          <span className={styles.titleGroup}>
            <span className={styles.title}>{title}</span>
            {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
          </span>
        </button>
        {headerExtra && <div className={styles.extra}>{headerExtra}</div>}
      </div>
      {open && (
        <div id={bodyId} className={styles.body}>
          {children}
        </div>
      )}
    </section>
  );
}
