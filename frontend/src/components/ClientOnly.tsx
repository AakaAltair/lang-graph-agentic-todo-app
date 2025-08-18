"use client";

import { useEffect, useState } from 'react';

interface ClientOnlyProps {
  children: React.ReactNode;
}

/**
 * A wrapper component that ensures its children are only rendered on the client-side.
 * This is useful for components that use browser-specific APIs (like window or document)
 * or to prevent server/client rendering mismatches (hydration errors).
 */
const ClientOnly: React.FC<ClientOnlyProps> = ({ children }) => {
  // State to track if the component has mounted on the client
  const [hasMounted, setHasMounted] = useState(false);

  // The useEffect hook only runs on the client, after the initial render.
  useEffect(() => {
    // When this runs, we know we are on the client, so we can safely render the children.
    setHasMounted(true);
  }, []); // The empty dependency array ensures this effect runs only once.

  // On the server render and the initial client render, hasMounted will be false.
  // In this case, we render nothing (null) to avoid hydration errors.
  if (!hasMounted) {
    return null;
  }

  // Once mounted on the client, we render the actual children.
  return <>{children}</>;
};

export default ClientOnly;