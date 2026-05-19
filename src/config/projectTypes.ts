export const projectTypes = [
  {
    value: "website",
    label: "Website",
    description: "Landing page, corporate site, ecommerce, or web platform.",
  },
  {
    value: "branding",
    label: "Logo / Brand Identity",
    description: "Logo, visual identity, brand system, or brand refresh.",
  },
  {
    value: "presentation",
    label: "Presentation",
    description: "Pitch deck, sales deck, report, or internal presentation.",
  },
  {
    value: "marketing_campaign",
    label: "Marketing Campaign",
    description: "Campaign strategy, creative concept, ads, or launch materials.",
  },
  {
    value: "digital_product",
    label: "App / Digital Product",
    description: "SaaS, mobile app, web app, MVP, or internal product.",
  },
] as const

export type ProjectType = (typeof projectTypes)[number]["value"]

