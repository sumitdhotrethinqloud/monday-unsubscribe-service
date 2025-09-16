
export default function Home() {
  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: "2rem" }}>
      <h1>✅ Unsubscribe Service Running</h1>
      <p>This service is connected to Monday.com and ready to handle unsubscribe requests.</p>
      <p>
        Try visiting{" "}
        <a href="/unsubscribe?token=TEST123" style={{ color: "blue" }}>
          /unsubscribe?token=TEST123
        </a>{" "}
        to test the unsubscribe flow.
      </p>
    </div>
  );
}
