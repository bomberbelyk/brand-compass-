export type UserRole =
  | "client"
  | "freelancer"
  | "agency_manager"
  | "consultant"
  | "internal_requester"

export type ProjectType =
  | "website"
  | "branding"
  | "presentation"
  | "marketing_campaign"
  | "digital_product"

export type ProjectStatus = "draft" | "interviewing" | "ready" | "archived"

export type ProjectLanguage = "uk" | "en"

export type Project = {
  id: string
  userId: string
  title: string
  projectType: ProjectType
  status: ProjectStatus
  interviewLanguage: ProjectLanguage
  documentLanguage: ProjectLanguage
  initialRequest: string
  maturityScore?: number
  createdAt: Date
  updatedAt: Date
}
