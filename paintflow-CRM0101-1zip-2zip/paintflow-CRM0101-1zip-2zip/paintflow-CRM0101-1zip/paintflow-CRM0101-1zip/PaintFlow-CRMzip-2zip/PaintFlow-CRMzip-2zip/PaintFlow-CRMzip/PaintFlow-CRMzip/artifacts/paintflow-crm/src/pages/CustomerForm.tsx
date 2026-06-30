import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Save, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import { useCustomer, useCreateCustomer, useUpdateCustomer } from "@/hooks/useCustomers";
import { INDIAN_STATES } from "@/types";

// ─── Validation schema ───────────────────────────────────────
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  alternate_mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number")
    .optional()
    .or(z.literal("")),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be 6 digits")
    .optional()
    .or(z.literal("")),
  gst_number: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      "Enter a valid GST number (e.g. 22AAAAA0000A1Z5)"
    )
    .optional()
    .or(z.literal("")),
  birthday: z.string().optional(),
  anniversary: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

// ─── Field wrapper helper ────────────────────────────────────
function Field({
  label,
  error,
  children,
  optional,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {optional && (
          <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────
function FormSkeleton() {
  return (
    <div className="space-y-6 max-w-3xl">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border border-border p-6 space-y-4">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
                <div className="h-9 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────
export default function CustomerForm() {
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: customer, isLoading: loadingCustomer } = useCustomer(id ?? "");
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
      alternate_mobile: "",
      email: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      gst_number: "",
      birthday: "",
      anniversary: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (customer && isEdit) {
      reset({
        name: customer.name,
        phone: customer.phone ?? "",
        alternate_mobile: customer.alternate_mobile ?? "",
        email: customer.email ?? "",
        address: customer.address ?? "",
        city: customer.city ?? "",
        state: customer.state ?? "",
        pincode: customer.pincode ?? "",
        gst_number: customer.gst_number ?? "",
        birthday: customer.birthday ?? "",
        anniversary: customer.anniversary ?? "",
        notes: customer.notes ?? "",
      });
    }
  }, [customer, isEdit, reset]);

  const onSubmit = async (values: FormValues) => {
    const clean = {
      name: values.name,
      phone: values.phone,
      alternate_mobile: values.alternate_mobile || null,
      email: values.email || null,
      address: values.address || null,
      city: values.city || null,
      state: values.state || null,
      pincode: values.pincode || null,
      gst_number: values.gst_number || null,
      birthday: values.birthday || null,
      anniversary: values.anniversary || null,
      notes: values.notes || null,
    };

    try {
      if (isEdit && id) {
        await updateCustomer.mutateAsync({ id, values: clean });
        navigate(`/customers/${id}`);
      } else {
        const newCustomer = await createCustomer.mutateAsync(clean);
        navigate(`/customers/${newCustomer.id}`);
      }
    } catch {
      // Error is handled by the mutation's onError (toast)
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Header
        title={isEdit ? "Edit Customer" : "Add Customer"}
        subtitle={
          isEdit
            ? `Editing ${customer?.name ?? "customer"}`
            : "Add a new customer to your CRM"
        }
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link to={isEdit && id ? `/customers/${id}` : "/customers"}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        {isEdit && loadingCustomer ? (
          <FormSkeleton />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6">
            {/* ─── Personal Info ─────────────────────────── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <Field label="Full Name" error={errors.name?.message}>
                    <Input
                      placeholder="e.g. Rajesh Gupta"
                      {...register("name")}
                      className={errors.name ? "border-destructive" : ""}
                    />
                  </Field>

                  <Field label="Mobile Number" error={errors.phone?.message}>
                    <Input
                      placeholder="10-digit mobile"
                      maxLength={10}
                      {...register("phone")}
                      className={errors.phone ? "border-destructive" : ""}
                    />
                  </Field>

                  <Field
                    label="Alternate Mobile"
                    error={errors.alternate_mobile?.message}
                    optional
                  >
                    <Input
                      placeholder="10-digit mobile"
                      maxLength={10}
                      {...register("alternate_mobile")}
                      className={errors.alternate_mobile ? "border-destructive" : ""}
                    />
                  </Field>

                  <Field label="Email Address" error={errors.email?.message} optional>
                    <Input
                      type="email"
                      placeholder="email@example.com"
                      {...register("email")}
                      className={errors.email ? "border-destructive" : ""}
                    />
                  </Field>

                  <Field label="Birthday" error={errors.birthday?.message} optional>
                    <Input
                      type="date"
                      {...register("birthday")}
                      className={errors.birthday ? "border-destructive" : ""}
                    />
                  </Field>

                  <Field
                    label="Anniversary"
                    error={errors.anniversary?.message}
                    optional
                  >
                    <Input
                      type="date"
                      {...register("anniversary")}
                      className={errors.anniversary ? "border-destructive" : ""}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* ─── Address ───────────────────────────────── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Address Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <Field label="Street Address" error={errors.address?.message} optional>
                      <Input
                        placeholder="House / Street / Area"
                        {...register("address")}
                      />
                    </Field>
                  </div>

                  <Field label="City" error={errors.city?.message} optional>
                    <Input placeholder="City" {...register("city")} />
                  </Field>

                  <Field label="State" error={errors.state?.message} optional>
                    <Controller
                      control={control}
                      name="state"
                      render={({ field }) => (
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            {INDIAN_STATES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </Field>

                  <Field label="Pincode" error={errors.pincode?.message} optional>
                    <Input
                      placeholder="6-digit pincode"
                      maxLength={6}
                      {...register("pincode")}
                      className={errors.pincode ? "border-destructive" : ""}
                    />
                  </Field>

                  <Field label="GST Number" error={errors.gst_number?.message} optional>
                    <Input
                      placeholder="e.g. 22AAAAA0000A1Z5"
                      className={`uppercase ${errors.gst_number ? "border-destructive" : ""}`}
                      {...register("gst_number", {
                        setValueAs: (v: string) => v.toUpperCase(),
                      })}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            {/* ─── Notes ─────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-base">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Field label="Notes" error={errors.notes?.message} optional>
                  <Textarea
                    placeholder="Any additional information about this customer…"
                    rows={4}
                    {...register("notes")}
                  />
                </Field>
              </CardContent>
            </Card>

            {/* ─── Actions ───────────────────────────────── */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEdit ? "Save Changes" : "Add Customer"}
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  navigate(isEdit && id ? `/customers/${id}` : "/customers")
                }
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
