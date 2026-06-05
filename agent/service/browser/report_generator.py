import base64
import json
import time
from pathlib import Path
from typing import Any

from agent.utils.logger import logger


async def generate_html_report(
    run_id: str,
    test_cases: list[dict[str, Any]],
    screenshots_dir: Path,
    output_dir: Path,
) -> Path:
    """Generate a self-contained HTML report for a UI test run.

    Args:
        run_id: Unique identifier for the test run.
        test_cases: List of test case result dicts with keys:
            - name: str
            - status: "pass" | "fail" | "skip"
            - duration_ms: int
            - error: str | None
            - screenshot: str | None (filename in screenshots_dir)
        screenshots_dir: Directory containing screenshot files.
        output_dir: Directory to write the report files into.

    Returns:
        Path to the generated report.html file.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    total = len(test_cases)
    passed = sum(1 for tc in test_cases if tc.get("status") == "pass")
    failed = sum(1 for tc in test_cases if tc.get("status") == "fail")
    skipped = sum(1 for tc in test_cases if tc.get("status") == "skip")
    total_duration_ms = sum(tc.get("duration_ms", 0) for tc in test_cases)

    # Build inline screenshots
    test_case_html_parts = []
    for tc in test_cases:
        status = tc.get("status", "unknown")
        status_class = {
            "pass": "status-pass",
            "fail": "status-fail",
            "skip": "status-skip",
        }.get(status, "status-unknown")

        screenshot_html = ""
        screenshot_file = tc.get("screenshot")
        if screenshot_file:
            screenshot_path = screenshots_dir / screenshot_file
            if screenshot_path.exists():
                img_data = base64.b64encode(screenshot_path.read_bytes()).decode()
                screenshot_html = (
                    f'<div class="screenshot">'
                    f'<img src="data:image/png;base64,{img_data}" alt="Screenshot" />'
                    f"</div>"
                )

        error_html = ""
        if tc.get("error"):
            error_html = (
                f'<div class="error-detail">'
                f"<strong>Error:</strong><pre>{tc['error']}</pre>"
                f"</div>"
            )

        test_case_html_parts.append(
            f'<div class="test-case {status_class}">'
            f'<div class="test-header">'
            f'<span class="test-name">{tc.get("name", "Unnamed")}</span>'
            f'<span class="test-status">{status.upper()}</span>'
            f'<span class="test-duration">{tc.get("duration_ms", 0)}ms</span>'
            f"</div>"
            f"{error_html}"
            f"{screenshot_html}"
            f"</div>"
        )

    test_cases_html = "\n".join(test_case_html_parts)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Test Report - {run_id}</title>
    <style>
        :root {{
            --mulberry: #8B3A62;
            --mulberry-light: #A84D7A;
            --mulberry-dark: #6B2D4C;
            --magenta: #C850C0;
            --bg: #1a1a2e;
            --card-bg: #25253e;
            --text: #e0e0e0;
            --text-muted: #a0a0b0;
        }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 20px;
        }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: var(--magenta); margin-bottom: 5px; }}
        .run-id {{ color: var(--text-muted); font-size: 14px; margin-bottom: 20px; }}
        .summary-bar {{
            display: flex;
            gap: 20px;
            background: var(--card-bg);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            border-left: 4px solid var(--mulberry);
        }}
        .summary-item {{ text-align: center; }}
        .summary-item .value {{ font-size: 28px; font-weight: bold; }}
        .summary-item .label {{ color: var(--text-muted); font-size: 12px; text-transform: uppercase; }}
        .summary-item.pass .value {{ color: #4caf50; }}
        .summary-item.fail .value {{ color: #f44336; }}
        .summary-item.skip .value {{ color: #ff9800; }}
        .test-case {{
            background: var(--card-bg);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid var(--mulberry);
        }}
        .test-case.status-pass {{ border-left-color: #4caf50; }}
        .test-case.status-fail {{ border-left-color: #f44336; }}
        .test-case.status-skip {{ border-left-color: #ff9800; }}
        .test-header {{ display: flex; align-items: center; gap: 12px; }}
        .test-name {{ font-weight: 600; flex: 1; }}
        .test-status {{ font-size: 12px; font-weight: bold; padding: 2px 8px; border-radius: 4px; }}
        .status-pass .test-status {{ background: #1b5e20; color: #4caf50; }}
        .status-fail .test-status {{ background: #b71c1c33; color: #f44336; }}
        .status-skip .test-status {{ background: #e65100; color: #ff9800; }}
        .test-duration {{ color: var(--text-muted); font-size: 12px; }}
        .error-detail {{ margin-top: 12px; padding: 12px; background: #b71c1c22; border-radius: 4px; }}
        .error-detail pre {{ white-space: pre-wrap; word-break: break-all; margin: 8px 0 0; color: #ef9a9a; }}
        .screenshot {{ margin-top: 12px; }}
        .screenshot img {{ max-width: 100%; border-radius: 4px; border: 1px solid #333; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>UI Test Report</h1>
        <div class="run-id">Run ID: {run_id} | Generated: {time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime())}</div>
        <div class="summary-bar">
            <div class="summary-item"><div class="value">{total}</div><div class="label">Total</div></div>
            <div class="summary-item pass"><div class="value">{passed}</div><div class="label">Passed</div></div>
            <div class="summary-item fail"><div class="value">{failed}</div><div class="label">Failed</div></div>
            <div class="summary-item skip"><div class="value">{skipped}</div><div class="label">Skipped</div></div>
            <div class="summary-item"><div class="value">{total_duration_ms}ms</div><div class="label">Duration</div></div>
        </div>
        {test_cases_html}
    </div>
</body>
</html>"""

    report_path = output_dir / "report.html"
    report_path.write_text(html_content, encoding="utf-8")

    # Also save structured JSON report
    report_json = {
        "run_id": run_id,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "duration_ms": total_duration_ms,
        },
        "test_cases": test_cases,
        "generated_at": time.time(),
    }
    json_path = output_dir / "report.json"
    json_path.write_text(json.dumps(report_json, indent=2), encoding="utf-8")

    logger.info(f"Report generated: {report_path}")
    return report_path
