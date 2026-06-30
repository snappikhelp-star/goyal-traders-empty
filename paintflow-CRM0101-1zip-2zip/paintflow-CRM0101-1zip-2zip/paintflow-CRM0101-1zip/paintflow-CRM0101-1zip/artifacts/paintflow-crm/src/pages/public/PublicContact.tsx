import { useForm } from "react-hook-form";
import { MessageCircle, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useShopProfile } from "@/lib/shopProfile";
import { openWhatsApp } from "@/lib/whatsapp";

interface InquiryForm {
  name: string;
  phone: string;
  interest: string;
  message: string;
}

export default function PublicContact() {
  const { profile } = useShopProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InquiryForm>({
    defaultValues: { name: "", phone: "", interest: "", message: "" },
  });

  const onSubmit = (data: InquiryForm) => {
    const lines = [
      `Namaste *${profile.shop_name}*,`,
      ``,
      `I would like to enquire about your products:`,
      `• Name: ${data.name}`,
      `• Phone: ${data.phone}`,
      `• Interested in: ${data.interest}`,
    ];
    if (data.message.trim()) {
      lines.push(`• Note: ${data.message.trim()}`);
    }
    lines.push(``, `Please get back to me. Thank you.`);
    openWhatsApp(profile.phone, lines.join("\n"));
    // Reset is best-effort — the user has already left for WhatsApp.
    reset();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Contact Us
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Send us an inquiry or order directly on WhatsApp.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {/* ── Inquiry form ─────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Send Inquiry</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
              data-testid="contact-inquiry-form"
            >
              <div className="space-y-1.5">
                <Label htmlFor="inq-name">Your Name</Label>
                <Input
                  id="inq-name"
                  placeholder="Full name"
                  {...register("name", {
                    required: "Name is required",
                    minLength: { value: 2, message: "At least 2 characters" },
                  })}
                  className={errors.name ? "border-destructive" : ""}
                  data-testid="contact-name"
                />
                {errors.name && (
                  <p className="text-xs text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inq-phone">Phone (with country code)</Label>
                <Input
                  id="inq-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 9876543210"
                  {...register("phone", {
                    required: "Phone is required",
                    pattern: {
                      value: /^[0-9+\-\s()]{8,}$/,
                      message: "Enter a valid phone number",
                    },
                  })}
                  className={errors.phone ? "border-destructive" : ""}
                  data-testid="contact-phone"
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inq-interest">Product of interest</Label>
                <Input
                  id="inq-interest"
                  placeholder="e.g. Asian Paints Royale, Jaquar tap"
                  {...register("interest", {
                    required: "Please tell us what you're interested in",
                  })}
                  className={errors.interest ? "border-destructive" : ""}
                  data-testid="contact-interest"
                />
                {errors.interest && (
                  <p className="text-xs text-destructive">
                    {errors.interest.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inq-note">
                  Note{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="inq-note"
                  placeholder="Any additional details"
                  {...register("message")}
                  data-testid="contact-note"
                />
              </div>

              <Button
                type="submit"
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting}
                data-testid="contact-submit-btn"
              >
                <Send className="h-4 w-4" />
                Send via WhatsApp
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Your inquiry opens in WhatsApp so we can respond instantly.
              </p>
            </form>
          </CardContent>
        </Card>

        {/* ── Shop info ─────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Visit the Shop</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Address</p>
                <p className="text-muted-foreground">{profile.address}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold">Call us</p>
                <a
                  href={`tel:${profile.phone.replace(/\s+/g, "")}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {profile.phone}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">WhatsApp</p>
                <p className="text-muted-foreground mb-2">
                  Fastest way to reach us.
                </p>
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    const msg =
                      `Namaste *${profile.shop_name}*,\n\n` +
                      `I would like to know more about your products.\n\n` +
                      `Thank you.`;
                    openWhatsApp(profile.phone, msg);
                  }}
                  data-testid="contact-direct-whatsapp-btn"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Open WhatsApp
                </Button>
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
              GSTIN: <span className="font-semibold">{profile.gstin}</span>
              <br />
              Proprietor: {profile.owner_name}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
