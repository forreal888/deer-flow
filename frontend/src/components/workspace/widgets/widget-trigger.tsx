import { LayoutDashboardIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/workspace/tooltip";
import { useI18n } from "@/core/i18n/hooks";

import { useMaybeSidecar } from "../sidecar/context";

import { useMaybeWidgets } from "./context";

export const WidgetTrigger = () => {
  const { t } = useI18n();
  const widgets = useMaybeWidgets();
  const sidecar = useMaybeSidecar();

  if (!widgets || widgets.widgets.length === 0) {
    return null;
  }
  return (
    <Tooltip content={t.common.showWidgets}>
      <Button
        aria-label={t.common.showWidgets}
        className="text-muted-foreground hover:text-foreground"
        variant="ghost"
        data-testid="widget-trigger"
        onClick={() => {
          sidecar?.close();
          widgets.setOpen(true);
        }}
      >
        <LayoutDashboardIcon />
        <span className="hidden sm:inline">{t.common.widgets}</span>
      </Button>
    </Tooltip>
  );
};
