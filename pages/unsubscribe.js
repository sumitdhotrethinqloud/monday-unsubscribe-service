import { useRouter } from "next/router";
import { useState } from "react";

export default function UnsubscribePage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState(null);

  const handleUnsubscribe = async (type) => {
    setStatus("loading");
    try {
      const res = await fetch(`/api/unsubscribe?token=${token}&type=${type}`);
      const data = await res.json();
      if (data.success) {
        setStatus(`success-${type}`);
      } else {
        setStatus("error");
      }
    } catch (e) {
      setStatus("error");
    }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      <h1>Manage Your Email Preferences</h1>
      {!token && <h2>Invalid link ❌</h2>}

      {token && !status && (
        <>
          <p>Select which emails you’d like to unsubscribe from:</p>
          <button onClick={() => handleUnsubscribe("marketing")}>Unsubscribe Marketing</button>
          <button onClick={() => handleUnsubscribe("newsletters")}>Unsubscribe Newsletters</button>
          <button onClick={() => handleUnsubscribe("both")}>Unsubscribe All</button>
        </>
      )}

      {status === "loading" && <h2>Processing your request…</h2>}
      {status?.startsWith("success") && (
        <h2>
          {status === "success-marketing" && "You unsubscribed from Marketing ✅"}
          {status === "success-newsletters" && "You unsubscribed from Newsletters ✅"}
          {status === "success-both" && "You unsubscribed from All Emails ✅"}
        </h2>
      )}
      {status === "error" && <h2>Something went wrong ❌</h2>}
    </div>
  );
}
