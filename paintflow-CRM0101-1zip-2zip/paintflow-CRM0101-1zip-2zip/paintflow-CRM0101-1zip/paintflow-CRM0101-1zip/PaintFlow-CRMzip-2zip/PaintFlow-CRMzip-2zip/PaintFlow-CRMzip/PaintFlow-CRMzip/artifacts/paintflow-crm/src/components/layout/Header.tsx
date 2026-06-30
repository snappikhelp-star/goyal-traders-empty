import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-6">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-foreground truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
