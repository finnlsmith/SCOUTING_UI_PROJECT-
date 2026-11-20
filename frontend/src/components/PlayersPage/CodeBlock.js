import React from "react";
import styles from "./PlayersPage.module.css";

/** Collapsible block of real project code, with the file it came from. */
export default function CodeBlock({ file, fn, note, code }) {
  return (
    <details className={styles.code}>
      <summary className={styles.codeSummary}>
        <code>{fn}</code> <span className={styles.codeFile}>{file}</span>
      </summary>
      <p className={styles.codeNote}>{note}</p>
      <pre className={styles.codePre}><code>{code}</code></pre>
    </details>
  );
}
