import React from "react";
import styles from "./ContactUs.module.css";

export default function ContactUsPage() {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>
        Contact Us
      </h2>

      <div className={styles.content}>
        <p>
          If you're interested to learn more about football statistics, data sources, or just chat about the
          beautiful game, don't hesitate to reach out.
        </p>
      </div>
    </div>
  );
}
