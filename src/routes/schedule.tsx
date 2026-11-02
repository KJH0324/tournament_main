import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/schedule")({
  beforeLoad: () => {
    throw redirect({ to: "/commands" });
  },
});
