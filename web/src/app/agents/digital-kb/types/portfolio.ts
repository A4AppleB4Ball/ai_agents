export interface Blocker {
  description: string;
  owner: string;
  age_days: number;
}

export interface Risk {
  level: "high" | "medium" | "low";
  description: string;
}

export interface Milestone {
  what: string;
  date: string | null;
  status: "done" | "active" | "upcoming" | "proposed" | "design" | "on-track" | "at-risk";
  progress: number;
  description?: string;
}

export interface KPI {
  label: string;
  value: string;
}

export interface NextMilestone {
  what: string;
  date: string;
  confidence: "high" | "medium" | "low";
}

export interface AttentionItem {
  level: "red" | "yellow";
  title: string;
  description: string;
  project_slug: string;
}

export interface UpcomingMilestone {
  date: string;
  project_name: string;
  project_slug: string;
  what: string;
  description?: string;
  status: string;
}

export interface PulseData {
  total_projects: number;
  green: number;
  yellow: number;
  red: number;
  stale: number;
}

export interface VerticalData {
  slug: string;
  name: string;
  projects: string[];
}

export interface StrategyData {
  summary: string;
  detail: string;
  h2_bets: string;
}

export interface ProjectSummary {
  name: string;
  slug: string;
  health: "green" | "yellow" | "red";
  phase: "discovery" | "development" | "production" | "sunset";
  owner: string;
  pm?: string;
  tech_lead?: string;
  vertical: string;
  last_updated: string;
  summary: string;
  accent?: string;
  next_milestone?: NextMilestone;
  blockers: Blocker[];
  risks: Risk[];
  milestones: Milestone[];
  kpis: KPI[];
  tech_stack: string[];
}

export interface PortfolioResponse {
  last_synced: string;
  commit_sha: string;
  pulse: PulseData;
  verticals: VerticalData[];
  projects: ProjectSummary[];
  strategy?: StrategyData;
  attention: AttentionItem[];
  upcoming_milestones: UpcomingMilestone[];
}

export interface InvestmentRow {
  year: number;
  investment: string;
  recurring?: string;
  cumul_cost: string;
  cumul_benefit: string;
  net: string;
}

export interface ModuleInfo {
  name: string;
  description: string;
}

export interface PeopleInfo {
  owner?: string;
  pm?: string;
  global_po?: string;
  product_owner?: string;
  tech_lead?: string;
  it_pm?: string;
  ba: string[];
}

export interface DatesInfo {
  programme_start?: string;
  current_release?: string;
  go_live?: string;
  horizon?: string;
}

export interface TimelineEntry {
  date: string;
  entries: string[];
}

export interface ProjectDetailResponse {
  name: string;
  slug: string;
  health: "green" | "yellow" | "red";
  phase: "discovery" | "development" | "production" | "sunset";
  owner: string;
  pm?: string;
  tech_lead?: string;
  vertical: string;
  last_updated: string;
  summary: string;
  accent?: string;
  what_it_is?: string;
  current_status?: string;
  business_impact: string[];
  dates?: DatesInfo;
  people?: PeopleInfo;
  next_milestone?: NextMilestone;
  blockers: Blocker[];
  risks: Risk[];
  milestones: Milestone[];
  investment: InvestmentRow[];
  kpis: KPI[];
  tech_stack: string[];
  data_sources: string[];
  modules: ModuleInfo[];
  timeline: TimelineEntry[];
}
