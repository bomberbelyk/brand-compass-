"use client";

import { useState } from "react";
import { LogoType, TypographyStyle } from "@/types/brandBrief";

const LOGO_TYPES: { id: LogoType; label: string; preview: React.ReactNode }[] = [
  {
    id: "wordmark",
    label: "Словознак",
    preview: (
      <svg viewBox="0 0 80 40" width={80} height={40}>
        <text x={8} y={27} fontSize={18} fontWeight={700} fontFamily="Arial" fill="currentColor">BRAND</text>
      </svg>
    ),
  },
  {
    id: "symbol_wordmark",
    label: "Символ + назва",
    preview: (
      <svg viewBox="0 0 80 40" width={80} height={40}>
        <rect x={6} y={10} width={20} height={20} rx={4} fill="currentColor" />
        <text x={32} y={25} fontSize={13} fontWeight={600} fontFamily="Arial" fill="currentColor">BRAND</text>
      </svg>
    ),
  },
  {
    id: "monogram",
    label: "Монограма",
    preview: (
      <svg viewBox="0 0 80 40" width={80} height={40}>
        <text x={22} y={30} fontSize={26} fontWeight={700} fontFamily="Georgia" fill="currentColor">BN</text>
      </svg>
    ),
  },
  {
    id: "abstract",
    label: "Абстрактний",
    preview: (
      <svg viewBox="0 0 80 40" width={80} height={40}>
        <circle cx={30} cy={20} r={12} fill="none" stroke="currentColor" strokeWidth={2.5} />
        <circle cx={38} cy={20} r={8} fill="currentColor" opacity={0.5} />
        <circle cx={46} cy={20} r={4} fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "emblem",
    label: "Емблема",
    preview: (
      <svg viewBox="0 0 80 40" width={80} height={40}>
        <polygon points="40,6 54,14 54,26 40,34 26,26 26,14" fill="none" stroke="currentColor" strokeWidth={2} />
        <text x={34} y={24} fontSize={10} fontWeight={700} fontFamily="Arial" fill="currentColor">BR</text>
      </svg>
    ),
  },
  {
    id: "not_sure",
    label: "Не знаю",
    preview: (
      <svg viewBox="0 0 80 40" width={80} height={40}>
        <text x={28} y={26} fontSize={22} fontFamily="Arial" fill="currentColor" opacity={0.4}>?</text>
      </svg>
    ),
  },
]

const TYPO_STYLES: { id: TypographyStyle; label: string; sample: string; style: React.CSSProperties }[] = [
  {
    id: "geometric",
    label: "Геометричний",
    sample: "Aa",
    style: { fontFamily: "Arial", fontWeight: 700, letterSpacing: "0.05em" },
  },
  {
    id: "elegant",
    label: "Елегантний",
    sample: "Aa",
    style: { fontFamily: "Georgia", fontWeight: 400, fontStyle: "italic" },
  },
  {
    id: "bold",
    label: "Жирний",
    sample: "Aa",
    style: { fontFamily: "Arial", fontWeight: 900 },
  },
  {
    id: "humanist",
    label: "Гуманістичний",
    sample: "Aa",
    style: { fontFamily: "Arial", fontWeight: 400, letterSpacing: "0.02em" },
  },
  {
    id: "technical",
    label: "Технічний",
    sample: "Aa",
    style: { fontFamily: "Courier New", fontWeight: 700 },
  },
  {
    id: "not_sure",
    label: "Не знаю",
    sample: "?",
    style: { fontFamily: "Arial", fontWeight: 400, opacity: 0.4 },
  },
]

type Props = {
  onComplete: (logoType: LogoType | null, typography: TypographyStyle | null, formatted: string) => void
}

export default function VisualDirectionScreen({ onComplete }: Props) {
  const [logoType, setLogoType] = useState<LogoType | null>(null)
  const [typography, setTypography] = useState<TypographyStyle | null>(null)

  function handleSubmit() {
    const logoLabel = LOGO_TYPES.find(l => l.id === logoType)?.label ?? "не вказано"
    const typoLabel = TYPO_STYLES.find(t => t.id === typography)?.label ?? "не вказано"
    const formatted = `[Візуальний напрямок]\nТип логотипу: ${logoLabel}\nТипографіка: ${typoLabel}`
    onComplete(logoType, typography, formatted)
  }

  return (
    <div className="screen-card">
      <div className="screen-label">Візуальний напрямок</div>

      <p className="screen-section-title">Тип логотипу</p>
      <div className="visual-grid">
        {LOGO_TYPES.map(item => (
          <button
            key={item.id}
            type="button"
            className={`visual-card${logoType === item.id ? " selected" : ""}`}
            onClick={() => setLogoType(item.id)}
          >
            <div className="visual-card-preview">{item.preview}</div>
            <span className="visual-card-label">{item.label}</span>
          </button>
        ))}
      </div>

      <p className="screen-section-title" style={{ marginTop: 24 }}>Стиль шрифту</p>
      <div className="visual-grid">
        {TYPO_STYLES.map(item => (
          <button
            key={item.id}
            type="button"
            className={`visual-card typo-card${typography === item.id ? " selected" : ""}`}
            onClick={() => setTypography(item.id)}
          >
            <div className="visual-card-preview">
              <span style={{ fontSize: 28, ...item.style }}>{item.sample}</span>
            </div>
            <span className="visual-card-label">{item.label}</span>
          </button>
        ))}
      </div>

      <button
        className="screen-continue-btn"
        onClick={handleSubmit}
        disabled={!logoType && !typography}
      >
        Продовжити →
      </button>
    </div>
  )
}
