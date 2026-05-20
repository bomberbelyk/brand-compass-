"use client";

type Props = { sessionId: string };

export default function BackToEditButton({ sessionId }: Props) {
  return (
    <a href={`/?resume=${sessionId}`} className="back-to-edit-btn">
      ← Повернутися до редагування
    </a>
  );
}
