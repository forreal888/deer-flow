import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

from langchain.tools import InjectedToolCallId, tool
from langchain_core.messages import ToolMessage
from langgraph.types import Command

from deerflow.tools.builtins.present_file_tool import _normalize_presented_filepath
from deerflow.tools.types import Runtime

_WIDGET_ID_PATTERN = re.compile(r"[^A-Za-z0-9_-]+")


def _widget_id_from_path(path: str) -> str:
    """Derive a stable widget id from a presented file path."""
    stem = _WIDGET_ID_PATTERN.sub("-", Path(path).stem).strip("-")
    return stem or "widget"


@tool("present_widget", parse_docstring=True)
def present_widget_tool(
    runtime: Runtime,
    filepath: str,
    title: str,
    tool_call_id: Annotated[str, InjectedToolCallId],
    widget_id: str | None = None,
) -> Command:
    """Pin an interactive HTML widget to the conversation dashboard.

    Use this tool when the user should see a self-contained, interactive view
    rather than plain text: dashboards, charts, tables, calculators, or any
    HTML/SVG artifact the user can read at a glance.

    When to use the present_widget tool:

    - Presenting data as a widget on the conversation dashboard
    - Updating a widget that was presented earlier (reuse the same widget_id)

    When NOT to use the present_widget tool:

    - Downloadable documents, reports, or source files (use present_files)
    - Temporary or intermediate files not meant for user viewing

    Notes:
    - Write the HTML file into `/mnt/user-data/outputs` first, then call this
      tool with its path. Only files under `/mnt/user-data/outputs` can be
      presented.
    - The file is rendered in a sandboxed iframe without same-origin access, so
      it must be self-contained (inline CSS/JS, no `localStorage`).
    - Reusing the same `widget_id` refreshes the existing widget instead of
      adding a new one.

    Args:
        filepath: Absolute path of the HTML/SVG file to present. **Only** files in `/mnt/user-data/outputs` can be presented.
        title: Short human-readable title shown in the dashboard header.
        widget_id: Optional stable id used to update an existing widget in place. Defaults to the file name.
    """
    try:
        normalized_path = _normalize_presented_filepath(runtime, filepath)
    except ValueError as exc:
        return Command(
            update={"messages": [ToolMessage(f"Error: {exc}", tool_call_id=tool_call_id)]},
        )

    entry = {
        "id": widget_id or _widget_id_from_path(normalized_path),
        "title": title,
        "path": normalized_path,
        "created_at": datetime.now(UTC).isoformat(),
    }

    # The merge_widgets reducer handles deduplication and in-place updates.
    return Command(
        update={
            "widgets": [entry],
            "messages": [ToolMessage(f"Successfully presented widget: {title}", tool_call_id=tool_call_id)],
        },
    )
