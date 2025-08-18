"use client";

import Link from 'next/link';
import React from 'react';
import SpinnerBorder from './SpinnerBorder'; // Assuming it's in the same directory

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
  isActive: boolean;
  // Allows any other Link props to be passed down
  [key: string]: any;
}

/**
 * A specialized navigation link that uses the SpinnerBorder component for its
 * visual style. It intelligently uses the Next.js <Link> component for routing.
 * Its active state is controlled by the 'isActive' prop.
 */
const NavLink: React.FC<NavLinkProps> = ({ href, children, isActive, ...rest }) => {
  // Combine the necessary classes. The `is-active` class will trigger
  // the styles we defined in our global CSS.
  const navLinkClasses = `btn ${isActive ? 'is-active' : ''}`.trim();

  return (
    // By passing the Next.js Link component to the 'as' prop, our SpinnerBorder
    // becomes a fully functional, pre-fetching navigation link.
    <SpinnerBorder
      as={Link}
      href={href}
      borderRadiusVar="--border-radius-btn"
      className={navLinkClasses}
      {...rest} // Pass down any other props like 'scroll={false}' etc.
    >
      {/* The content remains the same, ensuring text is above gradients. */}
      <span className="relative z-10">
        {children}
      </span>
    </SpinnerBorder>
  );
};

export default NavLink;