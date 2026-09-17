import { useQuery } from "@tanstack/react-query";

import { useThread } from "@/components/workspace/messages/context";

import { loadArtifactContent } from "../artifacts/loader";

/**
 * Load the HTML source of a presented widget.
 *
 * `revision` participates in the cache key so that re-presenting the same
 * widget id (which rewrites the file in place) refetches instead of serving
 * the stale body for the whole `staleTime` window.
 */
export function useWidgetContent({
  path,
  threadId,
  revision,
  enabled = true,
}: {
  path: string;
  threadId: string;
  revision?: string;
  enabled?: boolean;
}) {
  const { isMock } = useThread();

  const { data, isLoading, error } = useQuery({
    queryKey: ["widget", path, threadId, revision, isMock],
    queryFn: () => loadArtifactContent({ filepath: path, threadId, isMock }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    content: data?.content,
    url: data?.url,
    isLoading,
    error,
  };
}
