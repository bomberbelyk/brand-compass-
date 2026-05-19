import type { ClarityStatus } from "@/types/clarity"

export function getClarityStatus(score: number, hasConflict = false): ClarityStatus {
  if (hasConflict) return "conflict"
  if (score <= 20) return "missing"
  if (score <= 45) return "weak"
  if (score <= 70) return "partial"
  return "clear"
}

export function calculateMaturityScore(scores: number[]): number {
  if (scores.length === 0) return 0

  const total = scores.reduce((sum, score) => sum + score, 0)
  return Math.round(total / scores.length)
}

