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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createInsuree } from "@/lib/families-api";
import { getErrorMessage } from "@/lib/error-message";

const CreateInsureeSchema = z.object({
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

type CreateInsureeValues = z.infer<typeof CreateInsureeSchema>;

const DEFAULTS: CreateInsureeValues = {
  chfId: "",
  lastName: "",
  otherNames: "",
  gender: "M",
  dob: "",
  head: false,
  phone: "",
  email: "",
  currentAddress: "",
};

// Creates a standalone insuree, not attached to a household -- openIMIS's
// familyId field needs a raw integer id our reads don't expose (only a
// uuid), so linking a new insuree straight into a family isn't wired up
// here yet.
export function InsureeCreateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const createInsureeFn = useServerFn(createInsuree);

  const form = useForm<CreateInsureeValues>({
    resolver: zodResolver(CreateInsureeSchema),
    defaultValues: DEFAULTS,
  });

  async function onSubmit(values: CreateInsureeValues) {
    setSaving(true);
    try {
      await createInsureeFn({
        data: {
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
      toast.success("Insuree created in openIMIS");
      setOpen(false);
      form.reset(DEFAULTS);
      onCreated();
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to create insuree"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button type="button" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add insuree
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add insuree</DialogTitle>
          <DialogDescription>
            Creates a standalone insuree in openIMIS via <code>createInsuree</code> -- not yet
            attached to a household.
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
                Create insuree
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
