import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Loader2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { createPremium, updatePremium } from "@/lib/policy-api";
import type { Premium } from "@/lib/policy-api";

const PremiumSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  payType: z.string(),
  payDate: z.string(),
  receipt: z.string(),
});

type PremiumValues = z.infer<typeof PremiumSchema>;

function toDefaults(premium: Premium | undefined): PremiumValues {
  return {
    amount: premium?.amount ?? 0,
    payType: premium?.payType ?? "",
    payDate: premium?.payDate ?? "",
    receipt: premium?.receipt ?? "",
  };
}

// One dialog for both create and edit -- pass `premium` to edit an existing
// contribution, omit it to add a new one. Both mutations are fully
// buildable with no integer-id lookups: policyUuid is the only reference
// CreatePremiumMutationInput/UpdatePremiumMutationInput need, and we
// already have it as a plain string.
export function PremiumDialog({
  policyUuid,
  premium,
  onSaved,
}: {
  policyUuid: string;
  premium?: Premium;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const createPremiumFn = useServerFn(createPremium);
  const updatePremiumFn = useServerFn(updatePremium);
  const isEdit = !!premium;

  const form = useForm<PremiumValues>({
    resolver: zodResolver(PremiumSchema),
    defaultValues: toDefaults(premium),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(toDefaults(premium));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, premium]);

  async function onSubmit(values: PremiumValues) {
    setSaving(true);
    try {
      const payload = {
        policyUuid,
        amount: values.amount,
        payType: values.payType || null,
        payDate: values.payDate || null,
        receipt: values.receipt || null,
      };
      if (isEdit) {
        await updatePremiumFn({ data: { ...payload, uuid: premium.id } });
        toast.success("Contribution updated in openIMIS");
      } else {
        await createPremiumFn({ data: payload });
        toast.success("Contribution recorded in openIMIS");
      }
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save contribution");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {isEdit ? (
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
      ) : (
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add contribution
        </Button>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit contribution" : "Add contribution"}</DialogTitle>
          <DialogDescription>
            Written directly to openIMIS via{" "}
            <code>{isEdit ? "updatePremium" : "createPremium"}</code>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (KES)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="payDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="payType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cash, Bank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="receipt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receipt number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {isEdit ? "Save changes" : "Add contribution"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
