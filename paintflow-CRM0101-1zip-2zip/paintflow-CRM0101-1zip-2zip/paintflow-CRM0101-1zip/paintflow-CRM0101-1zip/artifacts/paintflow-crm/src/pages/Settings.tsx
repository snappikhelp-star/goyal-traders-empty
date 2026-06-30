import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  Save,
  Loader2,
  User,
  Store,
  Shield,
  Bell,
  Database,
  Download,
  Upload,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import {
  createBackup,
  downloadBackup,
  readAndValidateBackup,
  restoreBackup,
  BACKUP_TABLES,
  type BackupFile,
  type BackupTable,
  type RestoreReport,
} from "@/lib/backup";

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
  const canUseBackup = true;
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingShop, setSavingShop] = useState(false);

  // ── Backup & Restore state ────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [restoreReports, setRestoreReports] = useState<RestoreReport[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      currency: "INR",
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

  // ── Backup & Restore handlers ─────────────────────────────────────────
  const handleDownloadBackup = async () => {
    setDownloading(true);
    try {
      const backup = await createBackup();
      downloadBackup(backup);
      const total = Object.values(backup.counts).reduce((a, b) => a + b, 0);
      toast.success(`Backup downloaded — ${total.toLocaleString()} records`);
    } catch (e) {
      toast.error(`Backup failed: ${(e as Error).message}`);
    } finally {
      setDownloading(false);
    }
  };

  const handlePickRestoreFile = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFileSelected = async (
    ev: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = ev.target.files?.[0];
    // Reset so re-selecting the same file works
    ev.target.value = "";
    if (!file) return;
    setValidating(true);
    try {
      const result = await readAndValidateBackup(file);
      if (!result.ok || !result.backup) {
        toast.error(result.error ?? "Invalid backup file.");
        return;
      }
      setPendingBackup(result.backup);
    } finally {
      setValidating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;
    setRestoring(true);
    try {
      const reports = await restoreBackup(pendingBackup);
      setRestoreReports(reports);
      const inserted = reports.reduce((a, r) => a + r.inserted, 0);
      const failed = reports.reduce((a, r) => a + r.failed, 0);
      if (failed === 0) {
        toast.success(`Restore complete — ${inserted.toLocaleString()} records inserted`);
      } else {
        toast.warning(
          `Restore finished with errors: ${inserted.toLocaleString()} inserted, ${failed.toLocaleString()} failed`,
        );
      }
    } catch (e) {
      toast.error(`Restore failed: ${(e as Error).message}`);
    } finally {
      setRestoring(false);
      setPendingBackup(null);
    }
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
              {canUseBackup && (
                <TabsTrigger value="backup" className="gap-2" data-testid="settings-tab-backup">
                  <Database className="h-4 w-4" />
                  Backup
                </TabsTrigger>
              )}
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

                </CardContent>
              </Card>
            </TabsContent>
            {/* Backup Tab */}
            {canUseBackup && (
            <TabsContent value="backup">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Download Backup</CardTitle>
                    <CardDescription>
                      Export customers, products, suppliers, invoices, bill items,
                      and payments as a single JSON file. Keep this file safe — it
                      contains your complete shop data.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDownloadBackup}
                      disabled={downloading}
                      data-testid="backup-download-btn"
                    >
                      {downloading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Preparing backup…
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download Backup
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Restore from Backup
                    </CardTitle>
                    <CardDescription>
                      Upload a previously downloaded backup file (.json). The file
                      will be validated before any data is touched.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
                      Warning: this will replace existing data permanently.
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={handleRestoreFileSelected}
                      data-testid="backup-restore-input"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handlePickRestoreFile}
                      disabled={validating || restoring}
                      data-testid="backup-restore-btn"
                    >
                      {validating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validating…
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Choose Backup File
                        </>
                      )}
                    </Button>

                    {restoreReports && (
                      <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                        <p className="font-semibold mb-2">Last restore summary</p>
                        <ul className="space-y-1">
                          {restoreReports.map((r) => (
                            <li key={r.table} className="flex justify-between">
                              <span className="text-muted-foreground">{r.table}</span>
                              <span
                                className={
                                  r.failed > 0 ? "text-amber-700" : "text-foreground"
                                }
                              >
                                {r.inserted.toLocaleString()} inserted
                                {r.failed > 0
                                  ? ` · ${r.failed.toLocaleString()} failed`
                                  : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* ── Restore confirmation dialog ─────────────────────────────── */}
      <AlertDialog
        open={!!pendingBackup}
        onOpenChange={(open) => {
          if (!open && !restoring) setPendingBackup(null);
        }}
      >
        <AlertDialogContent data-testid="backup-restore-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Restore this backup?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="font-medium text-destructive">
                  This will replace existing data permanently.
                </p>
                {pendingBackup && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <p className="mb-2 text-foreground">
                      Backup from{" "}
                      <span className="font-medium">
                        {new Date(pendingBackup.exported_at).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                    </p>
                    <ul className="space-y-1">
                      {BACKUP_TABLES.map((t: BackupTable) => (
                        <li key={t} className="flex justify-between">
                          <span className="text-muted-foreground">{t}</span>
                          <span className="font-medium">
                            {(pendingBackup.counts[t] ?? 0).toLocaleString()}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs">
                  Make sure you have downloaded a fresh backup first.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRestore}
              disabled={restoring}
              data-testid="backup-restore-confirm-btn"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoring ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring…
                </>
              ) : (
                "Yes, replace data"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
