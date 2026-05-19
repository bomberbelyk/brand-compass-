export const pricingPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    limits: ["1 project", "15 interview messages", "Short brief", "Markdown export"],
  },
  {
    id: "starter",
    name: "Starter",
    price: 15,
    limits: ["One full project", "Brief Maturity Score", "Extended brief", "PDF export"],
  },
  {
    id: "solo",
    name: "Solo",
    price: 29,
    limits: ["20 projects per month", "All documents", "Saved templates", "Project history"],
  },
  {
    id: "studio",
    name: "Studio",
    price: 99,
    limits: ["100 projects", "Team access", "Branded PDF", "Public client links"],
  },
  {
    id: "agency",
    name: "Agency",
    price: 299,
    limits: ["White label", "Custom domain", "Multiple workspaces", "Integrations"],
  },
] as const

