"use client";

import { useState } from "react";
import { UsageLocation } from "@/types/brandBrief";

const USAGE_ITEMS: { id: UsageLocation; label: string; icon: React.ReactNode }[] = [
  {
    id: "website",
    label: "Сайт",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <rect x={2} y={4} width={20} height={15} rx={2} />
        <path d="M8 19v2M16 19v2M5 22h14" />
      </svg>
    ),
  },
  {
    id: "social_media",
    label: "Соцмережі",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <circle cx={18} cy={5} r={3} />
        <circle cx={6} cy={12} r={3} />
        <circle cx={18} cy={19} r={3} />
        <path d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
      </svg>
    ),
  },
  {
    id: "documents",
    label: "Документи",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    ),
  },
  {
    id: "presentations",
    label: "Презентації",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <path d="M2 3h20v13H2zM12 16v5M8 21h8" />
      </svg>
    ),
  },
  {
    id: "packaging",
    label: "Упаковка",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
      </svg>
    ),
  },
  {
    id: "signage",
    label: "Вивіска",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <rect x={2} y={3} width={20} height={12} rx={2} />
        <path d="M12 15v6M8 21h8" />
      </svg>
    ),
  },
  {
    id: "uniform",
    label: "Форма",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.57a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.57a2 2 0 0 0-1.34-2.23z" />
      </svg>
    ),
  },
  {
    id: "merchandise",
    label: "Мерч",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <circle cx={9} cy={21} r={1} /><circle cx={20} cy={21} r={1} />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>
    ),
  },
  {
    id: "app_icon",
    label: "App-іконка",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <rect x={5} y={2} width={14} height={20} rx={3} />
        <circle cx={12} cy={17} r={1} fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    id: "stickers",
    label: "Стікери",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.07-1.38L22 22l-1.38-5.93A9.94 9.94 0 0 0 22 12c0-5.52-4.48-10-10-10z" />
      </svg>
    ),
  },
  {
    id: "other",
    label: "Інше",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} width={24} height={24}>
        <circle cx={12} cy={12} r={1} fill="currentColor" stroke="none" />
        <circle cx={19} cy={12} r={1} fill="currentColor" stroke="none" />
        <circle cx={5} cy={12} r={1} fill="currentColor" stroke="none" />
      </svg>
    ),
  },
]

type Props = {
  onComplete: (locations: UsageLocation[], formatted: string) => void
}

export default function UsageScreen({ onComplete }: Props) {
  const [selected, setSelected] = useState<Set<UsageLocation>>(new Set())

  function toggle(id: UsageLocation) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSubmit() {
    const locations = Array.from(selected) as UsageLocation[]
    const labels = locations.map(id => USAGE_ITEMS.find(u => u.id === id)?.label ?? id)
    const formatted = `[Де використовується логотип]\n${labels.length ? labels.join(", ") : "не вказано"}`
    onComplete(locations, formatted)
  }

  return (
    <div className="screen-card">
      <div className="screen-label">Де буде жити логотип?</div>
      <p className="screen-hint">
        Виберіть усі варіанти — це впливає на формати і технічні вимоги.
      </p>

      <div className="usage-grid">
        {USAGE_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            className={`usage-card${selected.has(item.id) ? " selected" : ""}`}
            onClick={() => toggle(item.id)}
          >
            <div className="usage-card-icon">{item.icon}</div>
            <span className="usage-card-label">{item.label}</span>
          </button>
        ))}
      </div>

      <button
        className="screen-continue-btn"
        onClick={handleSubmit}
        disabled={selected.size === 0}
      >
        Продовжити →
      </button>
    </div>
  )
}
