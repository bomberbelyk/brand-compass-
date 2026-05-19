export type LogoType =
  | "wordmark"
  | "symbol_wordmark"
  | "monogram"
  | "abstract"
  | "emblem"
  | "not_sure"

export type TypographyStyle =
  | "geometric"
  | "elegant"
  | "bold"
  | "humanist"
  | "technical"
  | "not_sure"

export type UsageLocation =
  | "website"
  | "social_media"
  | "documents"
  | "presentations"
  | "packaging"
  | "signage"
  | "uniform"
  | "merchandise"
  | "app_icon"
  | "stickers"
  | "other"

export type BrandMood = {
  minExpressive: number    // 0=minimal, 100=expressive
  premAccessible: number   // 0=premium, 100=accessible
  seriousFriendly: number  // 0=serious, 100=friendly
  classicModern: number    // 0=classic, 100=modern
  softSharp: number        // 0=soft, 100=sharp
  localIntl: number        // 0=local, 100=international
}

export type VisualDirection = {
  logoType: LogoType | null
  typography: TypographyStyle | null
  preferredColors: string
  forbiddenColors: string
  references: string
  avoidCliches: string
}

export type PracticalUsage = {
  locations: UsageLocation[]
  needDarkLight: boolean
  needSmallSize: boolean
  needPrint: boolean
  needAnimation: boolean
}

export type BrandBrief = {
  companyBasics: {
    name: string
    website: string
    description: string
    category: string
    geography: string
    stage: "new" | "redesign" | "rebranding" | "expansion" | ""
  }
  brandEssence: {
    whatItDoes: string
    problemItSolves: string
    whyChoose: string
    keywords: string[]
    promise: string
    feeling: string
  }
  targetAudience: {
    description: string
    ageRange: string
    lifestyle: string
    needs: string
    fears: string
    decisionFactors: string
  }
  competitors: {
    name: string
    link: string
    liked: string
    avoid: string
  }[]
  visualDirection: VisualDirection
  mood: BrandMood
  practicalUsage: PracticalUsage
  scopeAndDeliverables: {
    deliverables: string[]
    deadline: string
    budget: string
    decisionMakers: string
    notes: string
  }
}
