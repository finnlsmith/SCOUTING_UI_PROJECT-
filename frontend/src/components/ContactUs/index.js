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

        <p>
          You can find us on LinkedIn —{" "}
          <a
            href="https://www.linkedin.com/in/meyhar-sharma-b97a78211"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Meyhar
          </a>
          ,{" "}
          <a
            href="https://www.linkedin.com/in/stacyjchang/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Stacy
          </a>
          ,{" "}
          <a
            href="https://www.linkedin.com/in/zubair-atha/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Zubair
          </a>
          , or{" "}
          <a
            href="https://www.linkedin.com/in/finn-laister-smith/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Finn
          </a>
          . You can also leave your message below.
        </p>
      </div>
    </div>
  );
}
