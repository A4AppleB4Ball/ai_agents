import re
from pathlib import Path

from agent.service.agents.digital_kb.models import TimelineEntry


class TimelineParser:
    """Parses timeline markdown files into structured entries."""

    def parse(self, file_path: Path) -> list[TimelineEntry]:
        """Parse a timeline file, returning entries sorted most recent first."""
        if not file_path.exists():
            return []

        content = file_path.read_text(encoding="utf-8")
        entries: list[TimelineEntry] = []

        # Split by ## YYYY-MM-DD headings
        sections = re.split(r"^##\s+(\d{4}-\d{2}-\d{2})\s*$", content, flags=re.MULTILINE)

        # sections[0] is content before first heading (ignored)
        # Then alternating: date, content, date, content, ...
        for i in range(1, len(sections), 2):
            date = sections[i]
            body = sections[i + 1] if i + 1 < len(sections) else ""

            # Extract bullet points
            bullets = []
            for line in body.strip().splitlines():
                line = line.strip()
                if line.startswith("- ") or line.startswith("* "):
                    bullets.append(line[2:].strip())

            if bullets:
                entries.append(TimelineEntry(date=date, entries=bullets))

        # Sort most recent first
        entries.sort(key=lambda e: e.date, reverse=True)
        return entries
