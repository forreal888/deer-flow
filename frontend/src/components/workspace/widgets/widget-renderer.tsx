import { LoaderIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { appendHtmlPreviewBaseHref } from "@/core/artifacts/preview";
import { useI18n } from "@/core/i18n/hooks";
import { useWidgetContent } from "@/core/widgets";
import { cn } from "@/lib/utils";

/**
 * Sandboxed renderer for a presented widget.
 *
 * The artifact endpoint serves `text/html` as an attachment, so the body is
 * fetched as text and re-mounted through a Blob URL — same approach as
 * `ArtifactFilePreview`. The iframe stays script-only (no `allow-same-origin`),
 * so widget code cannot reach the host document or its cookies.
 */
export function WidgetRenderer({
  className,
  path,
  revision,
  threadId,
}: {
  className?: string;
  path: string;
  revision?: string;
  threadId: string;
}) {
  const { t } = useI18n();
  const { content, url, isLoading, error } = useWidgetContent({
    path,
    threadId,
    revision,
  });
  const [previewUrl, setPreviewUrl] = useState<string>();

  useEffect(() => {
    if (content === undefined) {
      setPreviewUrl(undefined);
      return;
    }

    const blob = new Blob([appendHtmlPreviewBaseHref(content, url)], {
      type: "text/html;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [content, url]);

  if (error) {
    return (
      <div
        className={cn(
          "text-muted-foreground flex size-full items-center justify-center p-4 text-sm",
          className,
        )}
      >
        {t.common.widgetLoadFailed}
      </div>
    );
  }

  if (isLoading || !previewUrl) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center p-4",
          className,
        )}
      >
        <LoaderIcon className="text-muted-foreground size-5 animate-spin" />
      </div>
    );
  }

  return (
    <iframe
      className={cn("bg-background size-full", className)}
      title="Widget preview"
      sandbox="allow-scripts allow-forms"
      src={previewUrl}
    />
  );
}
