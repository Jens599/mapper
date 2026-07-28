"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  function toggleTheme() {
    if (!mounted) return;
    setTheme(dark ? "light" : "dark");
  }

  const label = mounted ? `Use ${dark ? "light" : "dark"} theme` : "Toggle theme";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={label}
          disabled={!mounted}
        >
          {!mounted ? <Moon aria-hidden="true" /> : dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{mounted ? (dark ? "Light theme" : "Dark theme") : "Theme"}</TooltipContent>
    </Tooltip>
  );
}
