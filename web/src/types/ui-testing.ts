/**
 * UI Testing Types
 *
 * Type definitions for the UI Testing Agent's test execution,
 * screenshots, history, and report rendering.
 */

// ==================== Test Events ====================

export type TestEventType =
  | 'session_ready'
  | 'plan'
  | 'case_start'
  | 'step_complete'
  | 'case_end'
  | 'report_ready'
  | 'session_closed';

export interface TestEvent {
  type: TestEventType;
  payload: Record<string, any>;
  timestamp: number;
}

// ==================== Test Plan ====================

export interface PlannedTestCase {
  id: string;
  name: string;
  description: string;
}

// ==================== Test Steps ====================

export type TestStepStatus = 'pass' | 'fail';

export interface TestStep {
  step: number;
  description: string;
  status: TestStepStatus;
  screenshot_base64?: string;
  timestamp: number;
}

// ==================== Test Cases ====================

export type TestCaseStatus = 'running' | 'pass' | 'fail' | 'skip';

export interface TestCase {
  id: string;
  name: string;
  status: TestCaseStatus;
  steps: TestStep[];
  duration_ms: number;
  started_at: number;
  ended_at?: number;
  error?: string;
}

// ==================== Screenshots ====================

export interface TestScreenshot {
  base64: string;
  case_id: string;
  step: number;
  description: string;
  timestamp: number;
}

// ==================== Report ====================

export interface TestRunSummary {
  total: number;
  pass: number;
  fail: number;
  skip: number;
}

export interface TestReport {
  summary: TestRunSummary;
  html: string;
  generated_at: number;
}

// ==================== Session Status ====================

export type TestSessionStatus = 'idle' | 'ready' | 'testing' | 'closed';
