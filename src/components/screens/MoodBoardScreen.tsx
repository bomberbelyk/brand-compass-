"use client";

import { useState } from "react";
import { BrandMood } from "@/types/brandBrief";

const SLIDERS = [
  { key: "minExpressive",   left: "Мінімальний",   right: "Виразний"      },
  { key: "premAccessible",  left: "Преміальний",   right: "Доступний"     },
  { key: "seriousFriendly", left: "Серйозний",     right: "Дружній"       },
  { key: "classicModern",   left: "Класичний",     right: "Сучасний"      },
  { key: "softSharp",       left: "М'який",        right: "Гострий"       },
  { key: "localIntl",       left: "Локальний",     right: "Міжнародний"   },
] as const

type SliderKey = typeof SLIDERS[number]["key"]

const DEFAULT_MOOD: BrandMood = {
  minExpressive:   50,
  premAccessible:  50,
  seriousFriendly: 50,
  classicModern:   50,
  softSharp:       50,
  localIntl:       50,
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function computePreview(mood: BrandMood) {
  const {
    minExpressive, premAccessible, seriousFriendly,
    classicModern, softSharp, localIntl,
  } = mood

  const t = (v: number) => v / 100

  // Shape roundness: soft=round (rx 40), sharp=square (rx 2)
  const rx = Math.round(lerp(40, 2, t(softSharp)))

  // Hue: local=warm olive (80), international=cool slate (210)
  const hue = Math.round(lerp(80, 210, t(localIntl)))

  // Saturation: serious=muted (15%), friendly=vivid (55%)
  const sat = Math.round(lerp(15, 55, t(seriousFriendly)))

  // Lightness of primary: premium=dark (20%), accessible=medium (48%)
  const lit = Math.round(lerp(20, 48, t(premAccessible)))

  const primaryColor = `hsl(${hue}, ${sat}%, ${lit}%)`

  // Background: very light tint of same hue
  const bgLit = Math.round(lerp(94, 97, t(premAccessible)))
  const bgSat = Math.round(sat * 0.25)
  const bgColor = `hsl(${hue}, ${bgSat}%, ${bgLit}%)`

  // Decorative elements count: 0 (minimal) → 3 (expressive)
  const decorCount = Math.round(lerp(0, 3, t(minExpressive)))

  // Mark inner shape: serious=diamond, friendly=circle
  const innerShape = seriousFriendly > 60 ? "circle" : seriousFriendly < 40 ? "diamond" : "square"

  // Text weight: classic=bold (8), modern=thin (3)
  const textH = Math.round(lerp(10, 5, t(classicModern)))

  return { rx, primaryColor, bgColor, decorCount, innerShape, textH, hue, sat, lit }
}

function PreviewSVG({ mood }: { mood: BrandMood }) {
  const p = computePreview(mood)

  const innerEl = () => {
    const cx = 100, cy = 42, size = 14
    if (p.innerShape === "circle") {
      return <circle cx={cx} cy={cy} r={size} fill={p.bgColor} opacity={0.5} />
    }
    if (p.innerShape === "diamond") {
      return (
        <polygon
          points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
          fill={p.bgColor}
          opacity={0.5}
        />
      )
    }
    return (
      <rect
        x={cx - size} y={cy - size / 2}
        width={size * 2} height={size}
        rx={2}
        fill={p.bgColor}
        opacity={0.4}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 200 130"
      className="mood-preview-svg"
      style={{ transition: "all 0.25s ease" }}
    >
      {/* Card */}
      <rect x={0} y={0} width={200} height={130} rx={14} fill={p.bgColor} />

      {/* Main mark */}
      <rect
        x={76} y={18}
        width={48} height={48}
        rx={p.rx}
        fill={p.primaryColor}
        style={{ transition: "all 0.25s ease" }}
      />

      {/* Inner element */}
      {innerEl()}

      {/* Decorative: small accents */}
      {p.decorCount >= 1 && (
        <circle cx={62} cy={42} r={6} fill={p.primaryColor} opacity={0.35} />
      )}
      {p.decorCount >= 2 && (
        <circle cx={138} cy={42} r={4} fill={p.primaryColor} opacity={0.25} />
      )}
      {p.decorCount >= 3 && (
        <rect x={88} y={12} width={24} height={4} rx={2} fill={p.primaryColor} opacity={0.45} />
      )}

      {/* Name bar */}
      <rect
        x={60} y={76}
        width={80} height={p.textH}
        rx={2}
        fill={p.primaryColor}
        opacity={0.85}
        style={{ transition: "all 0.25s ease" }}
      />

      {/* Tagline bar (if modern/expressive) */}
      {(mood.classicModern < 60 || mood.minExpressive > 40) && (
        <rect
          x={72} y={92}
          width={56} height={3}
          rx={1.5}
          fill={p.primaryColor}
          opacity={0.35}
        />
      )}
    </svg>
  )
}

type Props = {
  onComplete: (data: BrandMood, formatted: string) => void
}

export default function MoodBoardScreen({ onComplete }: Props) {
  const [mood, setMood] = useState<BrandMood>(DEFAULT_MOOD)

  function setSlider(key: SliderKey, value: number) {
    setMood(prev => ({ ...prev, [key]: value }))
  }

  function handleSubmit() {
    const lines = SLIDERS.map(s => {
      const v = mood[s.key]
      const leaning = v < 40 ? `← ${s.left}` : v > 60 ? `${s.right} →` : "по центру"
      return `${s.left} / ${s.right}: ${v}/100 (${leaning})`
    })
    const formatted = `[Mood Board]\n${lines.join("\n")}`
    onComplete(mood, formatted)
  }

  return (
    <div className="screen-card">
      <div className="screen-label">Настрій бренду</div>
      <p className="screen-hint">
        Пересуньте повзунки — і дивіться, як змінюється характер логотипу.
      </p>

      <div className="mood-preview-wrap">
        <PreviewSVG mood={mood} />
      </div>

      <div className="mood-sliders">
        {SLIDERS.map(s => (
          <div key={s.key} className="mood-slider-row">
            <span className="slider-label left">{s.left}</span>
            <input
              type="range"
              min={0}
              max={100}
              value={mood[s.key]}
              onChange={e => setSlider(s.key, Number(e.target.value))}
              className="mood-slider"
            />
            <span className="slider-label right">{s.right}</span>
          </div>
        ))}
      </div>

      <button className="screen-continue-btn" onClick={handleSubmit}>
        Продовжити →
      </button>
    </div>
  )
}
