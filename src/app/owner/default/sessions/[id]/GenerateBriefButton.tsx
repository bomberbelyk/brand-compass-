"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateBriefButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function generateBrief() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/sessions/${sessionId}/documents/generate`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error ?? "GENERATE_FAILED");

      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="action-block">
      <button className="primary-button" type="button" onClick={generateBrief} disabled={isLoading}>
        {isLoading ? "Generating..." : "Generate Client Brief"}
      </button>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}
