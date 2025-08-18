"use client";

import { useThemeStore } from "@/store/themeStore";
import { useEffect } from "react";

const ThemeManager = () => {
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    const root = document.documentElement; // The <html> element

    // ✅ FIX: The list of classes to remove now matches the themes in your CSS.
    // I also added 'theme-spectrum' in case you want to create it explicitly.
    const allThemes = ['theme-solar', 'theme-matrix', 'theme-oceanic', 'theme-mono', 'theme-spectrum'];
    
    root.classList.remove(...allThemes);
    
    // Add the current theme's class (if it's not the default)
    // The default :root styles will apply if no class is added.
    if (theme !== 'default') { // Assuming 'default' maps to :root
       root.classList.add(theme);
    }

  }, [theme]);

  return null; // This component renders nothing
};

export default ThemeManager;