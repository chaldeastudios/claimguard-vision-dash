import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/settings")({
  component: () => (
    <div className="space-y-4">
      <h1 className="font-serif text-4xl">
        <span className="accent-word">Settings</span>
      </h1>
      <p className="text-muted-foreground">
        Workspace and integration settings will appear here.
      </p>
      <div className="rounded-3xl bg-[color:var(--brand-cream)] p-8 text-sm text-muted-foreground">
        Coming soon — OpenIMIS connector configuration, reviewer roles, scoring thresholds.
      </div>
    </div>
  ),
});
