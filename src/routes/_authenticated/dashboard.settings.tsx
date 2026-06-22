import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, User } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: Settings,
});

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      setEmail(u.email ?? "");
      const meta = (u.user_metadata?.full_name as string) || (u.user_metadata?.name as string) || "";
      setFullName(meta);
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", u.id)
        .maybeSingle();
      if (profile?.full_name) setFullName(profile.full_name);
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, full_name: fullName, email }, { onConflict: "id" });
      if (error) throw error;
      await supabase.auth.updateUser({ data: { full_name: fullName } });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          <span className="accent-word">Settings</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Manage your reviewer profile.</p>
      </div>

      <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
        <h2 className="flex items-center gap-2 font-serif text-xl">
          <User className="h-4 w-4 text-[color:var(--brand-brown)]" /> Profile
        </h2>
        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Email</label>
              <input
                value={email}
                disabled
                className="mt-1 w-full rounded-full bg-background/60 px-4 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your display name"
                className="mt-1 w-full rounded-full bg-background px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--brand-brown)]/40"
              />
            </div>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-brown)] px-5 py-2.5 text-sm font-medium text-[color:var(--brand-brown-foreground)] hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
