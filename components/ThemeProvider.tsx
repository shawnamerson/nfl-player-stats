"use client";
import { ThemeProvider as NextThemes } from "next-themes";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"             // adds 'class' to <html> for dark mode
      defaultTheme="system"         // system by default
      enableSystem
      disableTransitionOnChange     // no flicker on toggle
    >
      {children}
    </NextThemes>
  );
}
