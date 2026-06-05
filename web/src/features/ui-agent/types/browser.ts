/**
 * Browser Panel Types
 *
 * TypeScript types for the UI-Agent live browser panel feature.
 */

export type BrowserActionType = "click" | "navigate" | "input" | "page_load" | "scroll" | "hover";

export interface BrowserFrame {
  session_id: string;
  data: string; // base64 JPEG
  timestamp: number;
}

export interface BrowserAction {
  session_id: string;
  action: BrowserActionType;
  detail: {
    url?: string;
    x?: number;
    y?: number;
    text?: string;
    selector?: string;
    description?: string;
  };
  timestamp: number;
}

export interface BrowserSessionInfo {
  session_id: string;
  session_name: string;
  url: string;
  created_at: number;
  screencast_active: boolean;
}

export type PanelMode = "live" | "report" | "history";

export interface TestRunSummary {
  run_id: string;
  target_url: string;
  total: number;
  pass: number;
  fail: number;
  skip: number;
  duration_ms: number;
  created_at: string;
}

export interface TestCaseResult {
  id: string;
  name: string;
  status: "pass" | "fail" | "skip";
  steps: TestStepResult[];
  duration_ms: number;
  error?: string;
}

export interface TestStepResult {
  step: number;
  description: string;
  status: "pass" | "fail";
  screenshot_url?: string;
  timestamp: number;
}

export interface TestReport {
  run_id: string;
  summary: { total: number; pass: number; fail: number; skip: number };
  test_cases: TestCaseResult[];
  html?: string;
  generated_at: string;
}

export type BrowserWsMessage =
  | ({ type: "frame" } & BrowserFrame)
  | ({ type: "action" } & BrowserAction)
  | ({ type: "session_started" } & BrowserSessionInfo)
  | ({ type: "session_closed" } & { session_id: string });
