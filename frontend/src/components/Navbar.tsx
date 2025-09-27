"use client";

import Link from 'next/link';
import NavLink from './NavLink';
import { usePathname } from 'next/navigation';

// Define the navigation links in a data structure.
// This makes managing links much easier than hardcoding them in JSX.
const navLinks = [
  { href: '/todo', label: 'To-Do' },
  { href: '/about', label: 'About' },
  { href: '/settings', label: 'Settings' },
];

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className="w-full p-4 sticky top-0 z-50 backdrop-blur-sm bg-black/20 border-b border-white/10">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-black text-[--text-heading] hover:text-[--text-accent] transition-colors">
          Lang Graph Agentic <span className="text-[--text-accent]">AI To-Do</span>
        </Link>
        
        {/* Map over the array to render the NavLink components */}
        <div className="flex items-center space-x-2 md:space-x-4">
          {navLinks.map((link) => (
            <NavLink
              key={link.href} // A unique key is essential for React lists
              href={link.href}
              isActive={pathname === link.href}
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;