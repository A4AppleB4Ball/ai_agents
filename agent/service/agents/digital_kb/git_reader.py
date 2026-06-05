import asyncio
from pathlib import Path

from agent.service.agents.digital_kb.config import DigitalKBConfig


class GitReader:
    """Manages git clone/pull operations for the Digital KB repository."""

    def __init__(self, config: DigitalKBConfig) -> None:
        self._config = config

    async def ensure_cloned(self) -> None:
        """Clone the repository if it does not exist, otherwise pull latest."""
        repo_path = self.get_repo_path()
        if repo_path.exists() and (repo_path / ".git").exists():
            await self.pull()
        else:
            await self._clone()

    async def pull(self) -> str:
        """Pull latest changes and return HEAD sha."""
        repo_path = self.get_repo_path()
        await self._run_git(["git", "pull", "--ff-only"], cwd=repo_path)
        sha = await self._get_head_sha()
        return sha

    async def _clone(self) -> None:
        """Clone the repository."""
        repo_path = self.get_repo_path()
        repo_path.parent.mkdir(parents=True, exist_ok=True)
        await self._run_git([
            "git", "clone",
            "--branch", self._config.branch,
            "--single-branch",
            self._config.repo_url,
            str(repo_path),
        ])

    async def _get_head_sha(self) -> str:
        """Get the current HEAD commit sha."""
        process = await asyncio.create_subprocess_exec(
            "git", "rev-parse", "HEAD",
            cwd=str(self.get_repo_path()),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(
                f"git rev-parse HEAD failed: {stderr.decode().strip()}"
            )
        return stdout.decode().strip()

    async def _run_git(self, cmd: list[str], cwd: Path | None = None) -> str:
        """Execute a git command and return stdout."""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=str(cwd) if cwd else None,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(
                f"Git command failed: {' '.join(cmd)}\n{stderr.decode().strip()}"
            )
        return stdout.decode().strip()

    def get_repo_path(self) -> Path:
        return Path(self._config.local_path)

    def get_projects_dir(self) -> Path:
        return self.get_repo_path() / "projects"

    def get_verticals_dir(self) -> Path:
        return self.get_repo_path() / "verticals"
