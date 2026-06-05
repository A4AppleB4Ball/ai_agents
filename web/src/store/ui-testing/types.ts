/**
 * UI Testing Store Types
 */

import {
  PlannedTestCase,
  TestCase,
  TestEvent,
  TestReport,
  TestScreenshot,
  TestSessionStatus,
} from '@/types/ui-testing';

export interface UITestingStoreState {
  // Session state
  session_status: TestSessionStatus;
  session_url: string | null;

  // Test plan
  planned_cases: PlannedTestCase[];

  // Active execution
  current_case: TestCase | null;
  cases: TestCase[];
  screenshots: TestScreenshot[];
  report: TestReport | null;

  // Raw event log
  events: TestEvent[];

  // Actions
  addEvent: (event: TestEvent) => void;
  reset: () => void;
}
