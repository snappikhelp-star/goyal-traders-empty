import { useState } from "react";
import { Smartphone, Monitor, X, Share, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePWAInstall } from "@/hooks/usePWAInstall";

// ── iOS Share→Add guide ──────────────────────────────────────

function IOSGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
      <Share className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
      <div className="flex-1 space-y-0.5">
        <p className="font-semibold text-blue-800">Add to Home Screen on iPhone / iPad</p>
        <p className="text-blue-700">
          Tap <span className="font-semibold">Share ⬆</span> in Safari, then tap{" "}
          <span className="font-semibold">Add to Home Screen</span> and confirm.
        </p>
      </div>
      <button onClick={onDismiss} className="text-blue-400 hover:text-blue-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Desktop/Android Chrome fallback guide ─────────────────────

function DesktopGuide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="mt-3 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
      <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div className="flex-1 space-y-0.5">
        <p className="font-semibold text-slate-700">Install via Chrome or Edge</p>
        <p className="text-slate-600">
          Open this page in <span className="font-semibold">Google Chrome</span> or{" "}
          <span className="font-semibold">Microsoft Edge</span>, then tap the install
          icon <span className="font-semibold">⊕</span> in the address bar.
        </p>
      </div>
      <button onClick={onDismiss} className="text-slate-400 hover:text-slate-600">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Main card ────────────────────────────────────────────────

export default function PWAInstallCard() {
  const { state, isIOS, isDesktop, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showDesktopGuide, setShowDesktopGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Already installed → never show
  if (state === "installed" || dismissed) return null;

  // On desktop, hide the card when there's no install path (no native prompt, not iOS)
  // On mobile/tablet, always show so users know they can install
  const isMobileDevice =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 1023px)").matches;
  if (state === "unsupported" && !isMobileDevice) return null;

  const handleMobileClick = () => {
    if (state === "installable") {
      promptInstall();
    } else if (isIOS) {
      setShowIOSGuide(true);
      setShowDesktopGuide(false);
    } else {
      // Android / other mobile — show Chrome guide
      setShowDesktopGuide(true);
      setShowIOSGuide(false);
    }
  };

  const handleDesktopClick = () => {
    if (state === "installable") {
      promptInstall();
    } else {
      setShowDesktopGuide(true);
      setShowIOSGuide(false);
    }
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            {/* New Goyal Traders logo */}
            <img
              src="/goyal-traders-logo.png"
              alt="GOYAL TRADERS"
              className="h-10 w-10 shrink-0 rounded-lg object-contain bg-white border border-blue-100 p-0.5 shadow-sm"
            />
            <div>
              <p className="text-sm font-bold text-blue-900">
                Install GOYAL TRADERS CRM
              </p>
              <p className="text-xs text-blue-600">
                Add to your home screen for one-tap access and offline use
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-blue-300 hover:text-blue-500 transition-colors shrink-0 mt-0.5"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {/* Primary install button — mobile + Android */}
          <Button
            size="sm"
            className="gap-2 bg-blue-700 hover:bg-blue-800 text-white text-xs"
            onClick={handleMobileClick}
          >
            <Smartphone className="h-3.5 w-3.5" />
            {isIOS ? "Add to Home Screen" : "📱 Install on Phone"}
          </Button>

          {/* Desktop install */}
          {!isIOS && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-100 text-xs"
              onClick={handleDesktopClick}
            >
              <Download className="h-3.5 w-3.5" />
              Install on Desktop
            </Button>
          )}
        </div>

        {/* iOS guide */}
        {showIOSGuide && <IOSGuide onDismiss={() => setShowIOSGuide(false)} />}

        {/* Desktop / Android Chrome guide */}
        {showDesktopGuide && (
          <DesktopGuide onDismiss={() => setShowDesktopGuide(false)} />
        )}
      </CardContent>
    </Card>
  );
}
