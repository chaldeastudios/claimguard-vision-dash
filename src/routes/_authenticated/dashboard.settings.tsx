import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, User, ImageUp } from "lucide-react";
import { CURRENT_PROFILE_QUERY_KEY, fetchCurrentProfile } from "@/lib/current-profile";
import { uploadOrganizationLogo, updateOrganizationName } from "@/lib/organization-logo";
import { OrganizationLogo } from "@/components/brand/organization-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/error-message";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const uploadLogoFn = useServerFn(uploadOrganizationLogo);
  const updateNameFn = useServerFn(updateOrganizationName);
  const { data: profile, isLoading } = useQuery({
    queryKey: CURRENT_PROFILE_QUERY_KEY,
    queryFn: fetchCurrentProfile,
  });

  const [orgName, setOrgName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // orgName starts null so the (async-loaded) profile value pre-fills the
  // input the first time, but local edits afterward always win.
  const nameValue = orgName ?? profile?.organizationName ?? "";

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateNameFn({ data: { name: nameValue } });
      await qc.invalidateQueries({ queryKey: CURRENT_PROFILE_QUERY_KEY });
      toast.success("Organization name updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !profile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      await uploadLogoFn({ data: formData });
      await qc.invalidateQueries({ queryKey: CURRENT_PROFILE_QUERY_KEY });
      toast.success("Logo updated — now live on your dashboard");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to upload logo"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-4xl">
          <span className="accent-word">Settings</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Manage your organization's branding.</p>
      </div>

      <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
        <h2 className="flex items-center gap-2 font-serif text-xl">
          <ImageUp className="h-4 w-4 text-[color:var(--brand-brown)]" /> Organization branding
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your organization's logo — it replaces the ClaimGuard mark across your dashboard
          and sign-in screen for anyone who signs into this institution.
        </p>
        <div className="mt-6 flex items-center gap-6">
          <div className="flex h-24 w-48 items-center justify-center rounded-2xl bg-background/60 p-4">
            <OrganizationLogo logoUrl={profile?.logoUrl} loading={isLoading} className="h-16" />
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoChange}
            />
            <button
              type="button"
              disabled={uploading || !profile}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--brand-brown)] px-5 py-2.5 text-sm font-medium text-[color:var(--brand-brown-foreground)] hover:opacity-90 disabled:opacity-60"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageUp className="h-4 w-4" />
              )}
              {profile?.logoUrl ? "Replace logo" : "Upload logo"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">PNG or JPG, up to 5MB.</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-[color:var(--brand-cream)] p-7">
        <h2 className="flex items-center gap-2 font-serif text-xl">
          <User className="h-4 w-4 text-[color:var(--brand-brown)]" /> Account
        </h2>
        {isLoading ? (
          <div className="mt-6 space-y-4">
            <div>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="mt-2 h-9 w-full rounded-full" />
            </div>
            <div>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-9 w-full rounded-full" />
            </div>
            <Skeleton className="h-10 w-36 rounded-full" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Signed in as (openIMIS username)
              </label>
              <input
                value={profile?.username ?? ""}
                disabled
                className="mt-1 w-full rounded-full bg-background/60 px-4 py-2 text-sm text-muted-foreground"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Organization name
              </label>
              <input
                value={nameValue}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Your organization's display name"
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
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
