import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
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
import { createFamily } from "@/lib/families-api";

const CreateFamilySchema = z.object({
  address: z.string(),
  poverty: z.boolean(),
  confirmationNo: z.string(),
});

type CreateFamilyValues = z.infer<typeof CreateFamilySchema>;

const DEFAULTS: CreateFamilyValues = { address: "", poverty: false, confirmationNo: "" };

// Creates a family shell without a location or head insuree -- both need a
// raw integer id (locationId) or a nested input type (headInsuree) we
// haven't confirmed the shape of yet. openIMIS's own business validation
// may reject a family with no location; if so, our write-confirmation check
// (confirmMutation) surfaces that as a real error here rather than a silent
// no-op, so this is worth trying rather than blocking on more introspection.
export function FamilyCreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const createFamilyFn = useServerFn(createFamily);

  const form = useForm<CreateFamilyValues>({
    resolver: zodResolver(CreateFamilySchema),
    defaultValues: DEFAULTS,
  });

  async function onSubmit(values: CreateFamilyValues) {
    setSaving(true);
    try {
      await createFamilyFn({
        data: {
          address: values.address || null,
          poverty: values.poverty,
          confirmationNo: values.confirmationNo || null,
        },
      });
      toast.success("Household created in openIMIS");
      setOpen(false);
      form.reset(DEFAULTS);
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create household");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add family
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add household</DialogTitle>
          <DialogDescription>
            Creates a family shell in openIMIS via <code>createFamily</code> -- no location or head
            insuree yet, add members from the household page afterward.
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
                Create household
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
