import type { Metadata } from "next";
import { Inter } from "next/font/google";

// Import the global CSS file which contains our design system and themes.
import "./globals.css";

// Import all the high-level provider and manager components.
import { Providers } from "./providers"; // React Query Provider
import Navbar from "@/components/Navbar";
import DesyncAnimations from "@/components/DesyncAnimations";
import ThemeManager from "@/components/ThemeManager";
import WebSocketManager from "@/components/WebSocketManager";
import FloatingChat from "@/components/FloatingChat";

// Initialize the font we'll be using.
const inter = Inter({ subsets: ["latin"] });

// Define the metadata for the application (e.g., for the browser tab title).
export const metadata: Metadata = {
  title: "Agentic AI To-Do App",
  description: "An AI-powered To-Do application that combines manual and conversational task management.",
};

/**
 * This is the RootLayout component. It is the main shell for the entire application.
 * Every page will be rendered inside this layout.
 * 
 * @param {object} props - The component's props.
 * @param {React.ReactNode} props.children - This prop will be the actual page component (e.g., HomePage, TodoPage) that Next.js renders based on the URL.
 * @returns {JSX.Element} The root HTML structure of the application.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // The `html` tag is the root of any web page.
    <html lang="en">
      {/* 
        The `body` tag contains all the visible content. We apply the font class here.
        The order of the components inside the body is important for stacking context (z-index).
        Components rendered later will appear on top of components rendered earlier, if they occupy the same space.
      */}
      <body className={inter.className}>
        
        {/*
          ThemeManager: A headless component that reads the theme from our Zustand store
          and applies the correct CSS class to the `<html>` tag. It renders nothing visible itself.
          It can be outside the Providers because it doesn't use React Query.
        */}
        <ThemeManager />

        {/*
          Providers: This component wraps our application with the React Query (TanStack Query) client.
          This makes data fetching and caching available to any component rendered INSIDE it.
        */}
        <Providers>
          
          {/*
            WebSocketManager: MOVED INSIDE Providers. This is the fix.
            It needs to be inside Providers because it uses the `useQueryClient()` hook to invalidate queries.
          */}
          <WebSocketManager />

          {/*
            Navbar: The main navigation bar that appears at the top of every page.
          */}
          <Navbar />

          {/*
            main: This is the primary content area. The `children` prop (which is our
            current page component) gets rendered here.
          */}
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>

          {/*
            DesyncAnimations: Another headless component to randomize animation delays.
          */}
          <DesyncAnimations />

          {/*
            FloatingChat: Our draggable and collapsible chat UI.
          */}
          <FloatingChat />
          
        </Providers>
      </body>
    </html>
  );
}