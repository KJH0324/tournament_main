import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/s/$slug")({
  loader: ({ params }) => {
    const slug = params.slug.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug)) {
      throw redirect({ href: "https://admin.raven-tournament.xyz/" });
    }
    throw redirect({ href: `https://admin.raven-tournament.xyz/s/${slug}` });
  },
  component: () => null,
});
