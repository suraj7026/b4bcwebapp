"use client";

// Override Next.js's auto-generated /_global-error to dodge a build-time bug:
//   Error [InvariantError]: Expected workStore to be initialized
// during `next build` prerender. Providing a user file replaces the default
// generator and the build completes.
//
// global-error.tsx is a Client Component that renders the html/body tags
// itself; it catches errors that escape every other error boundary, including
// the root layout.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          minHeight: "100vh",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          backgroundColor: "#f7f9fc",
          color: "#1a1a1a",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          Something went wrong
        </h2>
        <p style={{ color: "#555", maxWidth: 480 }}>
          {error?.message ?? "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            padding: "0.5rem 1rem",
            borderRadius: 8,
            border: "1px solid #003ec7",
            background: "#003ec7",
            color: "white",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
