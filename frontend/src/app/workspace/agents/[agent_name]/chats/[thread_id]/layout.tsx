"use client";

import { PromptInputProvider } from "@/components/ai-elements/prompt-input";
import { ArtifactsProvider } from "@/components/workspace/artifacts";
import { WidgetsProvider } from "@/components/workspace/widgets";
import { SubtasksProvider } from "@/core/tasks/context";

export default function AgentChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubtasksProvider>
      <ArtifactsProvider>
        <WidgetsProvider>
          <PromptInputProvider>{children}</PromptInputProvider>
        </WidgetsProvider>
      </ArtifactsProvider>
    </SubtasksProvider>
  );
}
