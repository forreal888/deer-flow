/**
 * A widget pinned to the conversation dashboard.
 *
 * Mirrors `WidgetEntry` in `deerflow.agents.thread_state` — the backend keeps
 * the board in thread state, so the client only reads it.
 */
export interface WidgetEntry {
  id: string;
  title: string;
  /** Virtual sandbox path, e.g. `/mnt/user-data/outputs/chart.html`. */
  path: string;
  created_at: string;
}

const EMPTY_WIDGETS: readonly WidgetEntry[] = [];

export function isWidgetEntry(value: unknown): value is WidgetEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as WidgetEntry).id === "string" &&
    typeof (value as WidgetEntry).title === "string" &&
    typeof (value as WidgetEntry).path === "string"
  );
}

/** Coerce the raw `thread.values.widgets` payload into a typed board. */
export function normalizeWidgets(value: unknown): WidgetEntry[] {
  if (!Array.isArray(value)) {
    return EMPTY_WIDGETS as WidgetEntry[];
  }
  return value.filter(isWidgetEntry);
}

const WIDGET_ID_PATTERN = /[^A-Za-z0-9_-]+/g;

/**
 * Mirror of `_widget_id_from_path` in
 * `deerflow.tools.builtins.present_widget_tool`, so a `present_widget` tool call
 * in the message stream can be matched against its board entry.
 */
export function widgetIdFromPath(path: string): string {
  const filename = path.split("/").pop() ?? path;
  const stem = filename.replace(/\.[^.]*$/, "");
  const id = stem.replace(WIDGET_ID_PATTERN, "-").replace(/^-+|-+$/g, "");
  return id || "widget";
}
