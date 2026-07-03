import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Pencil, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateFamily } from "@/lib/families-api";
import type { Family } from "@/lib/insuree.server";

const EditFamilySchema = z.object({
  address: z.string(),
  poverty: z.boolean(),
  confirmationNo: z.string(),
});

type EditFamilyValues = z.infer<typeof EditFamilySchema>;

export function FamilyEditDialog({ family, onSaved }: { family: Family; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateFamilyFn = useServerFn(updateFamily);

  const form = useForm<EditFamilyValues>({
    resolver: zodResolver(EditFamilySchema),
    defaultValues: {
      address: family.address,
      poverty: family.poverty,
      confirmationNo: family.confirmationNo,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      address: family.address,
      poverty: family.poverty,
      confirmationNo: family.confirmationNo,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, family]);

  async function onSubmit(values: EditFamilyValues) {
    setSaving(true);
    try {
      await updateFamilyFn({
        data: {
          uuid: family.id,
          address: values.address || null,
          poverty: values.poverty,
          confirmationNo: values.confirmationNo || null,
        },
      });
      toast.success("Household updated in openIMIS");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update household");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Pencil className="h-3.5 w-3.5" />
        Edit
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit household</DialogTitle>
          <DialogDescription>
            Changes are written directly to openIMIS via the <code>updateFamily</code> mutation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmationNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirmation number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="poverty"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border border-input px-3 py-2.5">
                  <FormLabel className="cursor-pointer">Below poverty line</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
