import { useState } from "react";
import { useForm } from "react-hook-form";
import { Save, Loader2, User, Store, Shield, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";

interface ProfileForm {
  full_name: string;
  email: string;
}

interface ShopForm {
  shop_name: string;
  address: string;
  phone: string;
  email: string;
  tax_number: string;
  tax_rate: number;
  currency: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  const profileForm = useForm<ProfileForm>({
    defaultValues: {
      full_name: "",
      email: user?.email ?? "",
    },
  });

  const shopForm = useForm<ShopForm>({
    defaultValues: {
      shop_name: "",
      address: "",
      phone: "",
      email: "",
      tax_number: "",
      tax_rate: 0,
      currency: "USD",
    },
  });

  const onSaveProfile = async (data: ProfileForm) => {
    setSavingProfile(true);
    // Will call Supabase profiles upsert when implemented
    setSavingProfile(false);
  };

  const onSaveShop = async (data: ShopForm) => {
    setSavingShop(true);
    // Will call Supabase shop_settings upsert when implemented
    setSavingShop(false);
  };

  return (
    <div className="flex flex-col h-full">
      <Header title="Settings" subtitle="Manage your account and shop preferences" />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <Tabs defaultValue="profile">
            <TabsList className="mb-6">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="shop" className="gap-2">
                <Store className="h-4 w-4" />
                Shop
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Security
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Information</CardTitle>
                  <CardDescription>
                    Update your name and email address.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        placeholder="Your full name"
                        {...profileForm.register("full_name")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        disabled
                        {...profileForm.register("email")}
                      />
                      <p className="text-xs text-muted-foreground">
                        Email changes require verification.
                      </p>
                    </div>
                    <Button type="submit" size="sm" disabled={savingProfile}>
                      {savingProfile ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Shop Tab */}
            <TabsContent value="shop">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Shop Information</CardTitle>
                  <CardDescription>
                    This information appears on your bills and invoices.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={shopForm.handleSubmit(onSaveShop)} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="shop_name">Shop Name</Label>
                        <Input
                          id="shop_name"
                          placeholder="My Paint Shop"
                          {...shopForm.register("shop_name")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shop_phone">Phone</Label>
                        <Input
                          id="shop_phone"
                          placeholder="+1 (555) 000-0000"
                          {...shopForm.register("phone")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shop_email">Email</Label>
                        <Input
                          id="shop_email"
                          type="email"
                          placeholder="shop@example.com"
                          {...shopForm.register("email")}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          placeholder="123 Main St, City, State"
                          {...shopForm.register("address")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_number">Tax / VAT Number</Label>
                        <Input
                          id="tax_number"
                          placeholder="Optional"
                          {...shopForm.register("tax_number")}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="tax_rate">Default Tax Rate (%)</Label>
                        <Input
                          id="tax_rate"
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          placeholder="0"
                          {...shopForm.register("tax_rate", { valueAsNumber: true })}
                        />
                      </div>
                    </div>
                    <Button type="submit" size="sm" disabled={savingShop}>
                      {savingShop ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                      ) : (
                        <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notification Preferences</CardTitle>
                  <CardDescription>
                    Choose what events you want to be notified about.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    { label: "Low stock alerts", description: "When an item falls below minimum stock" },
                    { label: "Overdue bills", description: "When a bill passes its due date" },
                    { label: "New customer", description: "When a new customer is added" },
                    { label: "Bill paid", description: "When a customer pays an invoice" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <Switch />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Security</CardTitle>
                  <CardDescription>Manage your password and account security.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="new_password">New Password</Label>
                    <Input
                      id="new_password"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_password">Confirm Password</Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                  <Button size="sm">
                    <Save className="mr-2 h-4 w-4" />
                    Update Password
                  </Button>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium text-destructive">Danger Zone</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-3">
                      These actions are permanent and cannot be undone.
                    </p>
                    <Button variant="destructive" size="sm">
                      Delete Account
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
