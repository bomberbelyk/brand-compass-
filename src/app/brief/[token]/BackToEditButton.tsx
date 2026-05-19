"use client";

type Props = { sessionId: string };

export default function BackToEditButton({ sessionId }: Props) {
  function handleClick() {
    localStorage.setItem("bc_session", JSON.stringify({ id: sessionId }));
  }

  return (
    <a href="/" className="back-to-edit-btn" onClick={handleClick}>
      ← Повернутися до редагування
    </a>
  );
}
