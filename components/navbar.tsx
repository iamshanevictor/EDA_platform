'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeSwitcher } from '@/components/theme-switcher';

export function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/upload', label: 'Upload CSV' },
    { href: '/data', label: 'Data Analysis' },
  ];

  return (
    <nav className="w-full border-b border-b-foreground/10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center space-x-8">
            <Link 
              href="/" 
              className="text-xl font-bold text-foreground hover:text-foreground/80 transition-colors"
              prefetch={true}
            >
              EDA Platform
            </Link>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-6">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`text-sm font-medium transition-colors hover:text-foreground/80 ${
                    pathname === item.href
                      ? 'text-foreground'
                      : 'text-foreground/60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side - Theme switcher */}
          <div className="flex items-center space-x-4">
            <ThemeSwitcher />
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-foreground/10">
          <div className="flex flex-col space-y-2 py-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={`text-sm font-medium transition-colors hover:text-foreground/80 px-2 py-1 rounded-md ${
                  pathname === item.href
                    ? 'text-foreground bg-foreground/10'
                    : 'text-foreground/60'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}