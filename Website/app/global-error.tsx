"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          backgroundColor: "#F6F8FB",
          color: "#475569",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            borderRadius: "16px",
            border: "1px solid #E6EAF2",
            backgroundColor: "#FFFFFF",
            padding: "32px",
            textAlign: "center",
            boxShadow:
              "0 1px 2px rgba(15,23,42,.04), 0 12px 32px -16px rgba(15,23,42,.16)",
          }}
        >
          <div
            style={{
              margin: "0 auto",
              width: "56px",
              height: "56px",
              display: "grid",
              placeItems: "center",
              borderRadius: "16px",
              backgroundColor: "#FEF2F2",
              color: "#DC2626",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" width="28" height="28" aria-hidden="true">
              <path
                d="M12 8v5m0 3.5h.01M10.3 3.9 2.6 17.4A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3.1L13.7 3.9a2 2 0 0 0-3.4 0Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1
            style={{
              margin: "16px 0 0",
              fontSize: "20px",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#0B1220",
            }}
          >
            Something went wrong
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: "14px", lineHeight: 1.6 }}>
            An unexpected error occurred while rendering this page. Our team has been
            notified. You can try again, or head back to the homepage.
          </p>
          {error.digest ? (
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#94A3B8" }}>
              Error reference: {error.digest}
            </p>
          ) : null}
          <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: "44px",
                borderRadius: "12px",
                border: "none",
                backgroundColor: "#12B2AA",
                color: "#FFFFFF",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                minHeight: "44px",
                borderRadius: "12px",
                border: "1px solid #E6EAF2",
                backgroundColor: "#FFFFFF",
                color: "#0B1220",
                fontSize: "14px",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              Back to home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
