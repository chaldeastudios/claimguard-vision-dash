import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard/insurees")({
  component: () => <Outlet />,
});
