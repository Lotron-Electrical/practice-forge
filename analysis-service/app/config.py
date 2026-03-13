import os


ANTHROPIC_API_KEY: str | None = os.environ.get("ANTHROPIC_API_KEY")
DATA_DIR: str = os.environ.get("DATA_DIR", "/tmp/analysis")
AUDIVERIS_JAR: str | None = os.environ.get("AUDIVERIS_JAR")
ANALYSIS_PORT: int = int(os.environ.get("ANALYSIS_PORT", "8001"))
