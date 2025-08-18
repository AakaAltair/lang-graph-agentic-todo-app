"use client";

import { useThemeStore } from "@/store/themeStore";
import SpinnerBorder from "@/components/SpinnerBorder";

// Define our themes so we can map over them
const themes = [
  { id: 'theme-cyber', name: 'Cyber Glow', colors: ['#e7009a', '#711c91', '#0abdc6'] },
  { id: 'theme-solar', name: 'Solar Flare', colors: ['#ffc947', '#f37121', '#d92027'] },
  { id: 'theme-matrix', name: 'Emerald Matrix', colors: ['#b4f8c8', '#8de09c', '#4da269'] },
  { id: 'theme-oceanic', name: 'Oceanic Depth', colors: ['#a2d2ff', '#528aae', '#2e6188'] },
  { id: 'theme-mono', name: 'Monochrome', colors: ['#ffffff', '#c0c0c0', '#808080'] },
];

export default function SettingsPage() {
  // Get the current theme and the function to set it from our store
  const { theme, setTheme } = useThemeStore();

  return (
    <div>
      <h1 className="text-4xl mb-8">Theme Settings</h1>
      <p className="text-[--text-secondary] mb-12">Select a visual theme for the application. Your choice will be saved for your next visit.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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