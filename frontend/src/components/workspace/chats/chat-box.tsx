import { FilesIcon, XIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConversationEmptyState } from "@/components/ai-elements/conversation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { normalizeWidgets } from "@/core/widgets";
import { env } from "@/env";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

import {
  ArtifactFileDetail,
  ArtifactFileList,
  useArtifacts,
} from "../artifacts";
import { useThread } from "../messages/context";
import { SidecarPanel, useMaybeSidecar } from "../sidecar";
import { useMaybeWidgets, WidgetPanel } from "../widgets";

const RIGHT_PANEL_ANIMATION_MS = 280;

type RightPanelKind = "sidecar" | "artifacts" | "widgets";

const ChatBox: React.FC<{ children: React.ReactNode; threadId: string }> = ({
  children,
  threadId,
}) => {
  const { thread } = useThread();
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const threadIdRef = useRef(threadId);

  const {
    artifacts,
    open: artifactsOpen,
    setOpen: setArtifactsOpen,
    setArtifacts,
    select: selectArtifact,
    deselect,
    selectedArtifact,
  } = useArtifacts();
  const sidecar = useMaybeSidecar();
  const sidecarOpen = sidecar?.open ?? false;
  const widgetsState = useMaybeWidgets();
  const widgetsOpen = widgetsState?.open ?? false;
  const setWidgets = widgetsState?.setWidgets;
  const setWidgetsOpen = widgetsState?.setOpen;
  const widgetCount = widgetsState?.widgets.length ?? 0;

  const [autoSelectFirstArtifact, setAutoSelectFirstArtifact] = useState(true);
  useEffect(() => {
    const threadArtifacts = Array.isArray(thread.values.artifacts)
      ? thread.values.artifacts
      : undefined;

    if (threadIdRef.current !== threadId) {
      threadIdRef.current = threadId;
      deselect();
      setArtifacts([]);
    }

    // Update artifacts from the current thread
    if (threadArtifacts) {
      setArtifacts(threadArtifacts);
    }

    // DO NOT automatically deselect the artifact when switching threads, because the artifacts auto discovering is not work now.
    // if (
    //   selectedArtifact &&
    //   !thread.values.artifacts?.includes(selectedArtifact)
    // ) {
    //   deselect();
    // }

    if (
      env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true" &&
      autoSelectFirstArtifact
    ) {
      if (threadArtifacts && threadArtifacts.length > 0) {
        setAutoSelectFirstArtifact(false);
        selectArtifact(threadArtifacts[0]!);
      }
    }
  }, [
    threadId,
    autoSelectFirstArtifact,
    deselect,
    selectArtifact,
    selectedArtifact,
    setArtifacts,
    thread.values.artifacts,
  ]);

  // The widget board lives in thread state; mirror it into the provider so the
  // panel and trigger stay in sync while a run streams new widgets in.
  const threadWidgets = thread.values.widgets;
  useEffect(() => {
    if (!setWidgets) {
      return;
    }
    setWidgets(normalizeWidgets(threadWidgets));
  }, [setWidgets, threadWidgets]);

  const widgetPanelOpen = useMemo(() => {
    if (sidecarOpen) {
      return false;
    }
    return widgetsOpen && widgetCount > 0;
  }, [sidecarOpen, widgetCount, widgetsOpen]);

  const artifactPanelOpen = useMemo(() => {
    if (sidecarOpen || widgetPanelOpen) {
      return false;
    }
    if (env.NEXT_PUBLIC_STATIC_WEBSITE_ONLY === "true") {
      return artifactsOpen && artifacts?.length > 0;
    }
    return artifactsOpen;
  }, [artifactsOpen, artifacts, sidecarOpen, widgetPanelOpen]);

  const activeRightPanel: RightPanelKind | null = sidecarOpen
    ? "sidecar"
    : widgetPanelOpen
      ? "widgets"
      : artifactPanelOpen
        ? "artifacts"
        : null;
  const rightPanelOpen = activeRightPanel !== null;
  const [renderedRightPanel, setRenderedRightPanel] =
    useState<RightPanelKind | null>(activeRightPanel);

  const resizableIdBase = useMemo(() => {
    return pathname.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  }, [pathname]);

  useEffect(() => {
    if (activeRightPanel) {
      setRenderedRightPanel(activeRightPanel);
      return;
    }

    const timeout = window.setTimeout(() => {
      setRenderedRightPanel(null);
    }, RIGHT_PANEL_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [activeRightPanel]);

  // The right panel shows one surface at a time: sidecar > widgets > artifacts.
  useEffect(() => {
    if (sidecarOpen && artifactsOpen) {
      setArtifactsOpen(false);
    }
    if (sidecarOpen && widgetsOpen) {
      setWidgetsOpen?.(false);
    }
    if (widgetsOpen && artifactsOpen) {
      setArtifactsOpen(false);
    }
  }, [
    artifactsOpen,
    setArtifactsOpen,
    setWidgetsOpen,
    sidecarOpen,
    widgetsOpen,
  ]);

  const rightPanelContent = useMemo(() => {
    if (renderedRightPanel === "sidecar") {
      return <SidecarPanel />;
    }
    if (renderedRightPanel === "widgets") {
      return <WidgetPanel className="size-full" threadId={threadId} />;
    }
    if (renderedRightPanel === "artifacts" && selectedArtifact) {
      return (
        <ArtifactFileDetail
          className="size-full"
          filepath={selectedArtifact}
          threadId={threadId}
        />
      );
    }
    if (renderedRightPanel === "artifacts") {
      return (
        <div className="relative flex size-full justify-center">
          <div className="absolute top-1 right-1 z-30">
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => {
                setArtifactsOpen(false);
              }}
            >
              <XIcon />
            </Button>
          </div>
          {artifacts.length === 0 ? (
            <ConversationEmptyState
              icon={<FilesIcon />}
              title="No artifact selected"
              description="Select an artifact to view its details"
            />
          ) : (
            <div className="flex size-full max-w-(--container-width-sm) flex-col justify-center p-4 pt-8">
              <header className="shrink-0">
                <h2 className="text-lg font-medium">Artifacts</h2>
              </header>
              <main className="min-h-0 grow">
                <ArtifactFileList
                  className="max-w-(--container-width-sm) p-4 pt-12"
                  files={artifacts}
                  threadId={threadId}
                />
              </main>
            </div>
          )}
        </div>
      );
    }
    return null;
  }, [
    renderedRightPanel,
    selectedArtifact,
    threadId,
    artifacts,
    setArtifactsOpen,
  ]);

  if (isMobile) {
    return (
      <>
        <div className="relative size-full min-w-0">{children}</div>
        <Sheet
          open={rightPanelOpen}
          onOpenChange={(open) => {
            if (open) {
              return;
            }
            if (sidecarOpen) {
              sidecar?.close();
            }
            if (artifactsOpen) {
              setArtifactsOpen(false);
            }
            if (widgetsOpen) {
              setWidgetsOpen?.(false);
            }
          }}
        >
          <SheetContent
            className="w-[calc(100vw-1rem)] max-w-none gap-0 p-0 sm:max-w-md [&>button]:hidden"
            side="right"
          >
            <SheetHeader className="sr-only">
              <SheetTitle>
                {renderedRightPanel === "sidecar"
                  ? "Sidecar"
                  : renderedRightPanel === "widgets"
                    ? "Widgets"
                    : "Artifacts"}
              </SheetTitle>
              <SheetDescription>
                Browse the side panel for this conversation.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 p-3 pt-10">{rightPanelContent}</div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <div
      id={`${resizableIdBase}-panels`}
      className={cn(
        "[container-type:inline-size] grid size-full min-h-0 transition-[grid-template-columns] duration-[280ms] ease-out motion-reduce:transition-none",
        rightPanelOpen
          ? "grid-cols-[minmax(0,1fr)_1px_minmax(0,40%)]"
          : "grid-cols-[minmax(0,1fr)_0px_0px]",
      )}
    >
      <div className="relative min-h-0 min-w-0" id="chat">
        {children}
      </div>
      <div
        id={`${resizableIdBase}-separator`}
        aria-hidden="true"
        className={cn(
          "bg-border opacity-33 transition-opacity duration-200 ease-out motion-reduce:transition-none",
          !rightPanelOpen && "pointer-events-none opacity-0",
        )}
      />
      <aside
        aria-hidden={!rightPanelOpen}
        className={cn(
          "min-h-0 min-w-0 overflow-hidden transition-opacity duration-[280ms] ease-out motion-reduce:transition-none",
          !rightPanelOpen && "pointer-events-none opacity-0",
        )}
        id="artifacts"
      >
        <div
          className={cn(
            "ml-auto h-full w-[40cqw] transition-opacity duration-[280ms] ease-out motion-reduce:transition-none",
            renderedRightPanel === "sidecar" ? "p-0" : "p-4",
            rightPanelOpen ? "opacity-100" : "opacity-0",
          )}
        >
          {rightPanelContent}
        </div>
      </aside>
    </div>
  );
};

export { ChatBox };
