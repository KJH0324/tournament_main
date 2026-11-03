import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/login")({
  loader: () => {
    throw redirect({ href: "https://admin.raven-tournament.xyz/" });
  },
  component: () => null,
});
