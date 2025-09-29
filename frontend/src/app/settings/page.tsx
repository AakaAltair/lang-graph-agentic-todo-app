"use client";

import { useEffect } from 'react'; // <-- Step 1: Import useEffect
import { useThemeStore } from "@/store/themeStore";
import SpinnerBorder from "@/components/SpinnerBorder";

// The definition of the themes remains the same.
const themes = [
  { id: 'theme-cyber', name: 'Cyber Glow', colors: ['#e7009a', '#711c91', '#0abdc6'] },
  { id: 'theme-solar', name: 'Solar Flare', colors: ['#ffc947', '#f37121', '#d92027'] },
  { id: 'theme-matrix', name: 'Emerald Matrix', colors: ['#b4f8c8', '#8de09c', '#4da269'] },
  { id: 'theme-oceanic', name: 'Oceanic Depth', colors: ['#a2d2ff', '#528aae', '#2e6188'] },
  { id: 'theme-mono', name: 'Monochrome', colors: ['#ffffff', '#c0c0c0', '#808080'] },
];

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();

  // --- Step 2: Add the useEffect hook for desynchronization ---
  useEffect(() => {
    // We select only the spinners within our "theme-grid" to avoid
    // accidentally changing the animations of other components like the navbar.
    const spinners = document.querySelectorAll('.theme-grid .spinner-border');

    spinners.forEach((spinner) => {
      const element = spinner as HTMLElement;
      
      // Generate a random duration between 2.5s and 5.0s
      const duration = Math.random() * 2.5 + 2.5;
      
      // Generate a random negative delay. This makes the spinners
      // start at different points in their animation cycle.
      const delay = -(Math.random() * duration);

      // Apply these random values as inline CSS variables to each card.
      element.style.setProperty('--spin-duration', `${duration.toFixed(2)}s`);
      element.style.setProperty('--spin-delay', `${delay.toFixed(2)}s`);
    });
  }, []); // The empty dependency array `[]` ensures this effect runs only ONCE after the page loads.

  return (
    <div>
      <h1 className="text-4xl mb-8">Theme Settings</h1>
      <p className="text-[--text-secondary] mb-12">Select a visual theme for the application. Your choice will be saved for your next visit.</p>

      {/* --- Step 3: Add a specific class to the grid container --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 theme-grid">
        {themes.map((themeOption) => (
          <div key={themeOption.id} onClick={() => setTheme(themeOption.id)} className="cursor-pointer">
            <SpinnerBorder
              borderRadiusVar="--border-radius-card"
              className={`card ${theme === themeOption.id ? 'is-active' : ''}`}
            >
              <div className="card-text-content p-6">
                <h3 className="text-2xl font-bold mb-4">{themeOption.name}</h3>
                <div className="flex space-x-2">
                  {themeOption.colors.map((color, index) => (
                    <div
                      key={index}
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </SpinnerBorder>
          </div>
        ))}
      </div>
    </div>
  );
}