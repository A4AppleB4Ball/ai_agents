import os


class DigitalKBConfig:
    """Configuration for Digital KB agent, loaded from environment variables."""

    repo_url: str
    branch: str
    local_path: str
    pull_interval_seconds: int

    def __init__(self) -> None:
        repo_url = os.environ.get("DIGITAL_KB_REPO_URL")
        if not repo_url:
            raise EnvironmentError("DIGITAL_KB_REPO_URL environment variable is required")

        local_path = os.environ.get("DIGITAL_KB_LOCAL_PATH")
        if not local_path:
            raise EnvironmentError("DIGITAL_KB_LOCAL_PATH environment variable is required")

        self.repo_url = repo_url
        self.local_path = local_path
        self.branch = os.environ.get("DIGITAL_KB_BRANCH", "knowledge")
        self.pull_interval_seconds = int(
            os.environ.get("DIGITAL_KB_PULL_INTERVAL", "300")
        )
