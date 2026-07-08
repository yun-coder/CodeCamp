"use client";

import { useState, useEffect } from "react";
import { useSettingsStore, type ThemePreset } from "@/store/settingsStore";

interface YunspireBrandingProps {
  size?: "sm" | "md";
  showSlogan?: boolean;
}

// Logo 变体按主题映射（影视胶片风格 SVG）。
const LOGO_SRC: Record<ThemePreset, string> = {
  "atelier-dark": "/logo-dark.svg",
  "bridge-dark": "/logo-dark.svg",
  "brand-dark": "/logo-dark.svg",
  "atelier-light": "/logo-light.svg",
  "brand-light": "/logo-light.svg",
};

export default function YunspireBranding({ size = "md", showSlogan = true }: YunspireBrandingProps) {
  const logoSize = size === "sm" ? "w-9 h-9" : "w-14 h-14";
  const titleSize = size === "sm" ? "text-lg" : "text-xl";

  const theme = useSettingsStore((s) => s.theme);
  // SSR 与客户端首次渲染统一用默认主题，避免 logo src 的 hydration mismatch；挂载后切到实际主题。
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const activeTheme: ThemePreset = mounted ? theme : "atelier-dark";
  const logoSrc = LOGO_SRC[activeTheme] ?? "/logo-dark.svg";

  return (
    <div>
      <div className="flex gap-3 items-center">
        <div className="flex-shrink-0">
          <img
            src={logoSrc}
            alt="Yunspire"
            className={`${logoSize} object-contain`}
          />
        </div>
        <div className="flex flex-col justify-center">
          <div className="flex items-baseline gap-0">
            <span className={`font-mono ${titleSize} font-bold tracking-tight text-foreground`}>
              YUN
            </span>
            <span className={`font-mono ${titleSize} font-black tracking-tight text-primary`}>
              SPIRE
            </span>
          </div>
          {size !== "sm" && (
            <span className="font-mono text-[0.6875rem] text-text-muted tracking-[0.2em] uppercase -mt-0.5">
              Studio
            </span>
          )}
        </div>
      </div>
      {showSlogan && (
        <p className="font-mono atelier-display text-[0.5rem] text-text-muted tracking-[0.15em] text-center mt-2.5 uppercase">
          Render Noise into Narrative
        </p>
      )}
    </div>
  );
}
