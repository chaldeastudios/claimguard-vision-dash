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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { updateInsuree } from "@/lib/families-api";
import type { Insuree } from "@/lib/insuree.server";
import { getErrorMessage } from "@/lib/error-message";

const EditInsureeSchema = z.object({
  chfId: z.string().min(1, "CHF ID is required"),
  lastName: z.string().min(1, "Last name is required"),
  otherNames: z.string().min(1, "Other names are required"),
  gender: z.enum(["M", "F"], { message: "Select a gender" }),
  dob: z.string().min(1, "Date of birth is required"),
  head: z.boolean(),
  phone: z.string(),
  email: z.string().email("Enter a valid email").or(z.literal("")),
  currentAddress: z.string(),
});

type EditInsureeValues = z.infer<typeof EditInsureeSchema>;

// Template for future entity edit dialogs (Family, Policy, ...): a shadcn
// Dialog wrapping a react-hook-form + zod form, submitting to a
// createServerFn mutation, then toasting and letting the caller refetch.
export function InsureeEditDialog({ insuree, onSaved }: { insuree: Insuree; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const updateInsureeFn = useServerFn(updateInsuree);

  const form = useForm<EditInsureeValues>({
    resolver: zodResolver(EditInsureeSchema),
    defaultValues: {
      chfId: insuree.chfId,
      lastName: insuree.lastName,
      otherNames: insuree.otherNames,
      gender: insuree.gender === "F" ? "F" : "M",
      dob: insuree.dob ?? "",
      head: insuree.head,
      phone: insuree.phone ?? "",
      email: insuree.email ?? "",
      currentAddress: "",
    },
  });

  // Re-sync when the dialog is reopened for a possibly-updated record.
  useEffect(() => {
    if (!open) return;
    form.reset({
      chfId: insuree.chfId,
      lastName: insuree.lastName,
      otherNames: insuree.otherNames,
      gender: insuree.gender === "F" ? "F" : "M",
      dob: insuree.dob ?? "",
      head: insuree.head,
      phone: insuree.phone ?? "",
      email: insuree.email ?? "",
      currentAddress: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, insuree]);

  async function onSubmit(values: EditInsureeValues) {
    setSaving(true);
    try {
      await updateInsureeFn({
        data: {
          uuid: insuree.id,
          chfId: values.chfId,
          lastName: values.lastName,
          otherNames: values.otherNames,
          gender: values.gender,
          dob: values.dob,
          head: values.head,
          phone: values.phone || null,
          email: values.email || null,
          currentAddress: values.currentAddress || null,
        },
      });
      toast.success("Insuree updated in openIMIS");
      setOpen(false);
      onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update insuree"));
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
          <DialogTitle>Edit insuree</DialogTitle>
          <DialogDescription>
            Changes are written directly to openIMIS via the <code>updateInsuree</code> mutation.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otherNames"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Other names</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="chfId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CHF ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="M">Male</SelectItem>
                        <SelectItem value="F">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="head"
                render={({ field }) => (
                  <FormItem className="flex flex-col justify-end pb-1.5">
                    <FormLabel>Head of household</FormLabel>
                    <FormControl>
                      <div className="flex h-9 items-center">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="currentAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current address</FormLabel>
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
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
