/**
 * UI Testing Store
 *
 * Manages test execution state: events, cases, screenshots, report.
 * Persisted to localStorage keyed by session.
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { UITestingStoreState } from './types';
import {
  PlannedTestCase,
  TestCase,
  TestEvent,
  TestScreenshot,
  TestSessionStatus,
} from '@/types/ui-testing';

function processEvent(state: UITestingStoreState, event: TestEvent): Partial<UITestingStoreState> {
  const { type, payload, timestamp } = event;

  switch (type) {
    case 'session_ready':
      return {
        session_status: 'ready' as TestSessionStatus,
        session_url: payload.url || null,
      };

    case 'plan':
      return {
        planned_cases: (payload.cases || []) as PlannedTestCase[],
        session_status: 'testing' as TestSessionStatus,
      };

    case 'case_start': {
      const existingIndex = state.cases.findIndex(c => c.id === payload.id);
      const newCase: TestCase = {
        id: payload.id,
        name: payload.name,
        status: 'running',
        steps: [],
        duration_ms: 0,
        started_at: timestamp,
      };
      const updatedCases = existingIndex >= 0
        ? state.cases.map((c, i) => i === existingIndex ? newCase : c)
        : [...state.cases, newCase];
      return {
        current_case: newCase,
        cases: updatedCases,
      };
    }

    case 'step_complete': {
      const caseId = payload.case_id;
      const step = {
        step: payload.step,
        description: payload.description || '',
        status: payload.status || 'pass',
        screenshot_base64: payload.screenshot_base64,
        timestamp,
      };

      const updatedCases = state.cases.map(c =>
        c.id === caseId ? { ...c, steps: [...c.steps, step] } : c
      );
      const updatedCurrent: TestCase | null = (state.current_case && state.current_case.id === caseId)
        ? { ...state.current_case, steps: [...state.current_case.steps, step] }
        : state.current_case;

      const screenshots: TestScreenshot[] = payload.screenshot_base64
        ? [...state.screenshots, {
            base64: payload.screenshot_base64,
            case_id: caseId,
            step: payload.step,
            description: payload.description || '',
            timestamp,
          }]
        : state.screenshots;

      return {
        cases: updatedCases,
        current_case: updatedCurrent,
        screenshots,
      };
    }

    case 'case_end': {
      const caseId = payload.id;
      const updatedCases = state.cases.map(c =>
        c.id === caseId
          ? { ...c, status: payload.status, duration_ms: payload.duration_ms || 0, ended_at: timestamp, error: payload.error }
          : c
      );
      return {
        cases: updatedCases,
        current_case: null,
      };
    }

    case 'report_ready':
      return {
        report: {
          summary: payload.summary || { total: 0, pass: 0, fail: 0, skip: 0 },
          html: payload.html || '',
          generated_at: timestamp,
        },
        session_status: 'testing' as TestSessionStatus,
      };

    case 'session_closed':
      return {
        session_status: 'closed' as TestSessionStatus,
        current_case: null,
      };

    default:
      return {};
  }
}

export const useUITestingStore = create<UITestingStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      session_status: 'idle',
      session_url: null,
      planned_cases: [],
      current_case: null,
      cases: [],
      screenshots: [],
      report: null,
      events: [],

      addEvent: (event: TestEvent) => {
        const state = get();
        const updates = processEvent(state, event);
        set({
          ...updates,
          events: [...state.events, event],
        });
      },

      reset: () => {
        set({
          session_status: 'idle',
          session_url: null,
          planned_cases: [],
          current_case: null,
          cases: [],
          screenshots: [],
          report: null,
          events: [],
        });
      },
    }),
    {
      name: 'ui-testing-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session_status: state.session_status,
        session_url: state.session_url,
        planned_cases: state.planned_cases,
        cases: state.cases,
        screenshots: state.screenshots,
        report: state.report,
        events: state.events,
      }),
    }
  )
);

export type { UITestingStoreState } from './types';
