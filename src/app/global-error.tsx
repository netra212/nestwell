"use client";
import Link from "next/link";
export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en-GB">
      <body
        style={{
          fontFamily: "Arial, sans-serif",
          background: "#faf9fc",
          color: "#292335",
          margin: 0,
        }}
      >
        <main
          style={{
            maxWidth: 520,
            margin: "15vh auto",
            padding: 24,
            textAlign: "center",
          }}
        >
          <p style={{ color: "#644192", fontWeight: 700 }}>NESTWELL · 500</p>
          <h1>Something went wrong.</h1>
          <p>We couldn’t load the page. Please try again.</p>
          <button
            onClick={reset}
            style={{
              background: "#644192",
              color: "white",
              border: 0,
              borderRadius: 8,
              padding: "14px 24px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <p>
            <Link href="/" style={{ color: "#644192" }}>
              Back home
            </Link>
          </p>
        </main>
      </body>
    </html>
  );
}
