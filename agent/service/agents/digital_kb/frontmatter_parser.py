import re
from pathlib import Path

import yaml


class FrontmatterParser:
    """Parses YAML frontmatter and body sections from markdown files."""

    def parse_state_file(self, file_path: Path) -> dict:
        """Parse a project state file, returning the YAML frontmatter as a dict."""
        frontmatter, _ = self._split_frontmatter(file_path)
        data = yaml.safe_load(frontmatter)
        if not isinstance(data, dict):
            raise ValueError(f"Invalid frontmatter in {file_path}: expected a mapping")
        # Validate required fields
        required_fields = ["name", "slug", "health", "phase", "owner", "vertical", "last_updated", "summary"]
        for field in required_fields:
            if field not in data:
                raise ValueError(f"Missing required field '{field}' in {file_path}")
        return data

    def parse_vertical_file(self, file_path: Path) -> dict:
        """Parse a vertical definition file."""
        frontmatter, _ = self._split_frontmatter(file_path)
        data = yaml.safe_load(frontmatter)
        if not isinstance(data, dict):
            raise ValueError(f"Invalid frontmatter in {file_path}: expected a mapping")
        if "slug" not in data or "name" not in data:
            raise ValueError(f"Missing required field 'slug' or 'name' in {file_path}")
        return data

    def parse_all_projects(self, projects_dir: Path) -> list[dict]:
        """Parse all project state files in the given directory."""
        if not projects_dir.exists():
            raise FileNotFoundError(f"Projects directory not found: {projects_dir}")
        projects = []
        for file_path in sorted(projects_dir.glob("*.md")):
            data = self.parse_state_file(file_path)
            # Attach body sections
            data["what_it_is"] = self.extract_body_section(file_path, "What it is")
            data["current_status"] = self.extract_body_section(file_path, "Current status")
            projects.append(data)
        return projects

    def extract_body_section(self, file_path: Path, heading: str) -> str | None:
        """Extract content under a ## heading from the body of the file."""
        _, body = self._split_frontmatter(file_path)
        if not body:
            return None

        # Find the heading (case-insensitive)
        pattern = re.compile(
            rf"^##\s+{re.escape(heading)}\s*$",
            re.MULTILINE | re.IGNORECASE,
        )
        match = pattern.search(body)
        if not match:
            return None

        # Extract content until next heading or end of file
        start = match.end()
        next_heading = re.search(r"^##\s+", body[start:], re.MULTILINE)
        if next_heading:
            content = body[start:start + next_heading.start()]
        else:
            content = body[start:]

        return content.strip() or None

    def _split_frontmatter(self, file_path: Path) -> tuple[str, str]:
        """Split a file into frontmatter and body parts."""
        content = file_path.read_text(encoding="utf-8")
        parts = content.split("---")
        if len(parts) < 3:
            raise ValueError(
                f"Invalid file format in {file_path}: expected YAML frontmatter delimited by '---'"
            )
        frontmatter = parts[1]
        body = "---".join(parts[2:])
        return frontmatter, body
