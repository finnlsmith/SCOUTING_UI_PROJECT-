import { useState } from "react";

const BACKEND_URL = "https://columbia-msds-f25-soccer.onrender.com";

export default function useUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    setError("");
    if (!file) {
      setError("Please choose a CSV file first!");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSuccess(true);
      return data;
    } catch (err) {
      setError("Upload failed: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  }

  return { file, setFile, upload, uploading, success, error, setError };
}
