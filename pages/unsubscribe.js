import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function UnsubscribePage() {
  const router = useRouter();
  const { token } = router.query;

  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!token) return;

    // By default we unsubscribe from BOTH (you can customize)
    fetch(`/api/unsubscribe?token=${token}&type=both`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div style={{ fontFamily: "sans-serif", padding: "2rem", textAlign: "center" }}>
      {status === "loading" && <h2>Processing your request…</h2>}
      {status === "success" && <h2>You’ve been unsubscribed ✅</h2>}
      {status === "error" && <h2>Invalid or expired link ❌</h2>}
    </div>
  );
}
