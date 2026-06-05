"use client";

import { useCallback, useMemo, useRef } from "react";
import { TestReport, TestCase, TestScreenshot } from "@/types/ui-testing";
import { useUITestingStore } from "@/store/ui-testing";

function generateReportHtml(cases: TestCase[], screenshots: TestScreenshot[], summary: { total: number; pass: number; fail: number; skip: number }): string {
  const passRate = summary.total > 0 ? Math.round((summary.pass / summary.total) * 100) : 0;
  const screenshotMap = new Map<string, TestScreenshot[]>();
  for (const s of screenshots) {
    const key = s.case_id;
    if (!screenshotMap.has(key)) screenshotMap.set(key, []);
    screenshotMap.get(key)!.push(s);
  }

  const casesHtml = cases.map(c => {
    const statusColor = c.status === 'pass' ? '#28a745' : c.status === 'fail' ? '#dc3545' : '#ffc107';
    const caseScreenshots = screenshotMap.get(c.id) || [];
    const stepsHtml = c.steps.map(s => `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #f0f0f0;">
        <span style="width:8px;height:8px;border-radius:50%;background:${s.status === 'pass' ? '#28a745' : '#dc3545'};flex-shrink:0;"></span>
        <span style="font-family:monospace;font-size:12px;color:#666;min-width:32px;">Step ${s.step}</span>
        <span style="font-size:13px;">${s.description}</span>
        <span style="margin-left:auto;font-size:11px;font-weight:600;color:${s.status === 'pass' ? '#28a745' : '#dc3545'};">${s.status.toUpperCase()}</span>
      </div>
    `).join('');

    const screenshotsHtml = caseScreenshots.map(s => `
      <div style="display:inline-block;margin:4px;border:1px solid #eee;border-radius:8px;overflow:hidden;width:280px;">
        <img src="data:image/png;base64,${s.base64}" style="width:100%;height:160px;object-fit:cover;object-position:top;" />
        <div style="padding:6px 8px;font-size:11px;color:#666;">Step ${s.step}: ${s.description}</div>
      </div>
    `).join('');

    return `
      <div style="margin-bottom:24px;border:1px solid #e0e0e0;border-radius:12px;overflow:hidden;">
        <div style="display:flex;align-items:center;gap:12px;padding:16px 20px;background:#fafafa;border-bottom:1px solid #e0e0e0;">
          <span style="font-size:12px;font-weight:700;padding:4px 10px;border-radius:4px;background:${statusColor}20;color:${statusColor};">${c.status.toUpperCase()}</span>
          <span style="font-size:15px;font-weight:600;">${c.name}</span>
          <span style="font-family:monospace;font-size:12px;color:#888;">${c.id}</span>
          <span style="margin-left:auto;font-family:monospace;font-size:12px;color:#888;">${c.duration_ms}ms</span>
        </div>
        <div style="padding:12px 20px;">${stepsHtml}</div>
        ${c.error ? `<div style="padding:12px 20px;background:#fff5f5;color:#dc3545;font-size:13px;border-top:1px solid #fee;">${c.error}</div>` : ''}
        ${screenshotsHtml ? `<div style="padding:12px 20px;border-top:1px solid #f0f0f0;overflow-x:auto;white-space:nowrap;">${screenshotsHtml}</div>` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI Test Report - ${new Date().toISOString().slice(0, 10)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; background: #f8f9fa; color: #1a1a2e; }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; }
    .header h1 { font-size: 24px; margin: 0 0 8px; }
    .header p { font-size: 14px; color: #666; margin: 0; }
    .summary { display: flex; gap: 16px; justify-content: center; margin: 24px 0 40px; }
    .summary-card { padding: 16px 24px; border-radius: 12px; text-align: center; min-width: 100px; }
    .summary-card .value { font-size: 28px; font-weight: 700; font-family: monospace; }
    .summary-card .label { font-size: 12px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>UI Test Report</h1>
      <p>Generated: ${new Date().toLocaleString()} | Pass Rate: ${passRate}%</p>
    </div>
    <div class="summary">
      <div class="summary-card" style="background:#f0fff4;border:1px solid #c6f6d5;">
        <div class="value" style="color:#28a745;">${summary.pass}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card" style="background:#fff5f5;border:1px solid #fed7d7;">
        <div class="value" style="color:#dc3545;">${summary.fail}</div>
        <div class="label">Failed</div>
      </div>
      <div class="summary-card" style="background:#fffff0;border:1px solid #fefcbf;">
        <div class="value" style="color:#d69e2e;">${summary.skip}</div>
        <div class="label">Skipped</div>
      </div>
      <div class="summary-card" style="background:#f7fafc;border:1px solid #e2e8f0;">
        <div class="value" style="color:#4a5568;">${summary.total}</div>
        <div class="label">Total</div>
      </div>
    </div>
    ${casesHtml}
  </div>
</body>
</html>`;
}

interface TestReportViewProps {
  report: TestReport | null;
}

export function TestReportView({ report }: TestReportViewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cases = useUITestingStore((s) => s.cases);
  const screenshots = useUITestingStore((s) => s.screenshots);

  const effectiveHtml = useMemo(() => {
    if (report?.html && report.html.length > 50) return report.html;
    if (cases.length === 0) return "";
    const summary = report?.summary || {
      total: cases.length,
      pass: cases.filter(c => c.status === "pass").length,
      fail: cases.filter(c => c.status === "fail").length,
      skip: cases.filter(c => c.status === "skip").length,
    };
    return generateReportHtml(cases, screenshots, summary);
  }, [report, cases, screenshots]);

  const handleDownload = useCallback(() => {
    if (!effectiveHtml) return;
    const blob = new Blob([effectiveHtml], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ui-test-report-${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [effectiveHtml]);

  const handleDownloadZip = useCallback(async () => {
    if (!effectiveHtml) return;
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    zip.file("report.html", effectiveHtml);

    const summary = {
      generated_at: new Date().toISOString(),
      summary: reportSummary,
      cases: cases.map((c: TestCase) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        duration_ms: c.duration_ms,
        steps_count: c.steps.length,
      })),
    };
    zip.file("summary.json", JSON.stringify(summary, null, 2));

    const screenshotsFolder = zip.folder("screenshots");
    if (screenshotsFolder) {
      screenshots.forEach((s: TestScreenshot) => {
        const filename = `${s.case_id}_step-${String(s.step).padStart(2, "0")}.png`;
        screenshotsFolder.file(filename, s.base64, { base64: true });
      });
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ui-test-report-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }, [effectiveHtml, cases, screenshots]);

  if (!effectiveHtml) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-sm" style={{ color: "var(--gray-text)" }}>
          No report generated yet
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--gray-text)", opacity: 0.7 }}>
          The test report will appear here after all test cases complete.
        </p>
      </div>
    );
  }

  const reportSummary = report?.summary || {
    total: cases.length,
    pass: cases.filter(c => c.status === "pass").length,
    fail: cases.filter(c => c.status === "fail").length,
    skip: cases.filter(c => c.status === "skip").length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Report toolbar */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0 border-b"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
            Test Report
          </span>
          <div className="flex gap-2">
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(40,167,69,0.1)", color: "#155724", fontFamily: "var(--font-mono)" }}
            >
              {reportSummary.pass} pass
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(220,53,69,0.1)", color: "#721c24", fontFamily: "var(--font-mono)" }}
            >
              {reportSummary.fail} fail
            </span>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: "rgba(0,0,0,0.04)", color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}
            >
              {reportSummary.total} total
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="text-xs px-3 py-1.5 rounded-md transition-colors font-medium"
            style={{
              background: "rgba(131,0,81,0.08)",
              color: "var(--mulberry)",
            }}
          >
            Download HTML
          </button>
          <button
            onClick={handleDownloadZip}
            className="text-xs px-3 py-1.5 rounded-md transition-colors font-medium"
            style={{
              background: "rgba(131,0,81,0.14)",
              color: "var(--mulberry)",
            }}
          >
            Download ZIP
          </button>
        </div>
      </div>

      {/* Report iframe */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          srcDoc={effectiveHtml}
          title="Test Report"
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
          style={{ background: "white" }}
        />
      </div>
    </div>
  );
}
