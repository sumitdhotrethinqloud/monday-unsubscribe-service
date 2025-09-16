import { useRouter } from "next/router";
import { useState } from "react";

export default function UnsubscribePage() {
  const router = useRouter();
  const { token } = router.query;
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUnsubscribe(type) {
    setLoading(true);
    try {
      const res = await fetch(`/api/unsubscribe?token=${token}&type=${type}`);
      const data = await res.json();
      if (data.success) {
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
      {status === "success" && <h2>✅ You’ve been unsubscribed</h2>}
      {status === "error" && <h2>❌ Invalid or expired link</h2>}
    </div>
  );
}
