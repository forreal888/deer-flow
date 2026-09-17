import { LayoutDashboardIcon, XIcon } from "lucide-react";

import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/core/i18n/hooks";
import { cn } from "@/lib/utils";

import { useWidgets } from "./context";
import { WidgetRenderer } from "./widget-renderer";

export function WidgetPanel({
  className,
  threadId,
}: {
  className?: string;
  threadId: string;
}) {
  const { t } = useI18n();
  const { widgets, activeWidgetId, select, setOpen } = useWidgets();
  const activeWidget =
    widgets.find((widget) => widget.id === activeWidgetId) ?? null;

  if (!activeWidget) {
    return (
      <div className={cn("relative flex size-full justify-center", className)}>
        <div className="absolute top-1 right-1 z-30">
          <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)}>
            <XIcon />
          </Button>
        </div>
        <ConversationEmptyState
          icon={<LayoutDashboardIcon />}
          title={t.common.noWidget}
          description={t.common.noWidgetDescription}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex size-full min-h-0 flex-col gap-3", className)}>
      <header className="flex shrink-0 items-start gap-2">
        <div className="min-w-0 grow">
          <h2 className="truncate text-sm font-medium">{activeWidget.title}</h2>
          <p className="text-muted-foreground truncate text-xs">
            {activeWidget.path}
          </p>
        </div>
        <Button size="icon-sm" variant="ghost" onClick={() => setOpen(false)}>
          <XIcon />
        </Button>
      </header>

      {widgets.length > 1 && (
        <nav className="flex shrink-0 gap-1 overflow-x-auto pb-1">
          {widgets.map((widget) => (
            <Button
              key={widget.id}
              className={cn(
                "shrink-0 text-xs",
                widget.id === activeWidget.id && "bg-accent",
              )}
              size="sm"
              variant="ghost"
              onClick={() => select(widget.id)}
            >
              {widget.title}
            </Button>
          ))}
        </nav>
      )}

      <div className="min-h-0 grow overflow-hidden rounded-lg border">
        <WidgetRenderer
          key={activeWidget.id}
          path={activeWidget.path}
          revision={activeWidget.created_at}
          threadId={threadId}
        />
      </div>
    </div>
  );
}
