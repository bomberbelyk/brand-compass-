"use client";

import { useState } from "react";

type Props = { documentId: string; token: string };

export default function BriefConfirmButton({ documentId, token }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function handleConfirm() {
    setState("loading");
    try {
      const res = await fetch(`/api/brief/${token}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (res.ok) setState("done");
      else setState("idle");
    } catch {
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="brief-confirmed-banner">
        Бриф підтверджено. Виконавець може починати роботу.
      </div>
    );
  }

  return (
    <button
      className="primary-button"
      onClick={handleConfirm}
      disabled={state === "loading"}
    >
      {state === "loading" ? "Підтверджую..." : "Підтвердити бриф"}
    </button>
  );
}
