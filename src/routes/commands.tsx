import { createFileRoute } from "@tanstack/react-router";
import { CommandList } from "@/components/command-list";
import { manualGroups } from "@/lib/discord/manual";
import { PageHead, Shell } from "@/components/shell";

export const Route = createFileRoute("/commands")({
  head: () => ({ meta: [{ title: "슬래시 명령어 · KJH Bot" }] }),
  loader: () => ({ groups: manualGroups() }),
  component: CommandsPage,
});

function CommandsPage() {
  const { groups } = Route.useLoaderData();
  return (
    <Shell>
      <PageHead title="슬래시 명령어" />
      <div className="mt-6">
        <CommandList groups={groups} />
      </div>
    </Shell>
  );
}
