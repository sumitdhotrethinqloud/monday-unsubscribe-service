// pages/unsubscribe.js
import { useRouter } from "next/router";
import { useState } from "react";

export default function UnsubscribePage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [unsubType, setUnsubType] = useState("");

  async function handleUnsubscribe(type) {
    setLoading(true);
    try {
      const res = await fetch(`/api/unsubscribe?token=${token}&type=${type}`);
      const data = await res.json();
      if (data.success) {
        setUnsubType(type);   // ✅ store what user chose
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  function renderSuccessMessage() {
    if (unsubType === "marketing") return "✅ You’ve unsubscribed from Marketing emails.";
    if (unsubType === "newsletter") return "✅ You’ve unsubscribed from Newsletters.";
    if (unsubType === "both") return "✅ You’ve unsubscribed from Marketing & Newsletters.";
    return "✅ You’ve been unsubscribed.";
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      <h1>Email Preferences</h1>

      {!status && (
        <>
          <p>Select what you want to unsubscribe from:</p>
          <button onClick={() => handleUnsubscribe("marketing")} disabled={loading}>Marketing</button>
          <button onClick={() => handleUnsubscribe("newsletter")} disabled={loading}>Newsletter</button>
          <button onClick={() => handleUnsubscribe("both")} disabled={loading}>Both</button>
        </>
      )}

      {status === "success" && <h2>{renderSuccessMessage()}</h2>}
      {status === "error" && <h2>❌ Invalid or expired link</h2>}
    </div>
  );
}
