import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRole } from "@/lib/permissions";

export default function Forbidden() {
  const navigate = useNavigate();
  const { role } = useRole();

  return (
    <div
      className="flex h-full w-full items-center justify-center p-6"
      data-testid="forbidden-page"
    >
      <div className="max-w-md text-center space-y-5">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">Access denied</h1>
          <p className="text-sm text-muted-foreground">
            Your role
            {role ? (
              <>
                {" "}
                (<span className="font-medium">{role}</span>)
              </>
            ) : null}{" "}
            does not have permission to view this page. If you believe this is
            a mistake, please contact the shop administrator.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard", { replace: true })}
          >
            Open Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
