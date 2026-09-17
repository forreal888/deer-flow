import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useSidebar } from "@/components/ui/sidebar";
import type { WidgetEntry } from "@/core/widgets";
import { env } from "@/env";

export interface WidgetsContextType {
  widgets: WidgetEntry[];
  setWidgets: (widgets: WidgetEntry[]) => void;

  /** Widget id currently shown in the panel; `null` falls back to the newest. */
  selectedWidgetId: string | null;
  select: (widgetId: string | null) => void;

  /** Resolved id: the explicit selection when still present, else the newest. */
  activeWidgetId: string | null;

  open: boolean;
  setOpen: (open: boolean) => void;
}

const WidgetsContext = createContext<WidgetsContextType | undefined>(undefined);

interface WidgetsProviderProps {
  children: ReactNode;
}

export function WidgetsProvider({ children }: WidgetsProviderProps) {
  const [widgets, setWidgets] = useState<WidgetEntry[]>([]);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { setOpen: setSidebarOpen } = useSidebar();

  const select = useCallback(
    (widgetId: string | null) => {
      setSelectedWidgetId(widgetId);
      if (widgetId && env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true") {
        setSidebarOpen(false);
      }
    },
    [setSidebarOpen],
  );

  const setOpenWithSidebar = useCallback(
    (isOpen: boolean) => {
      if (isOpen && env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY !== "true") {
        setSidebarOpen(false);
      }
      setOpen(isOpen);
    },
    [setSidebarOpen],
  );

  const activeWidgetId = useMemo(() => {
    if (selectedWidgetId && widgets.some((w) => w.id === selectedWidgetId)) {
      return selectedWidgetId;
    }
    return widgets.at(-1)?.id ?? null;
  }, [selectedWidgetId, widgets]);

  const value: WidgetsContextType = {
    widgets,
    setWidgets,
    selectedWidgetId,
    select,
    activeWidgetId,
    open,
    setOpen: setOpenWithSidebar,
  };

  return (
    <WidgetsContext.Provider value={value}>{children}</WidgetsContext.Provider>
  );
}

export function useMaybeWidgets() {
  return useContext(WidgetsContext);
}

export function useWidgets() {
  const context = useMaybeWidgets();
  if (context === undefined) {
    throw new Error("useWidgets must be used within a WidgetsProvider");
  }
  return context;
}
