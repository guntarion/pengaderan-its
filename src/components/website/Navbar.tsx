// src/components/website/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/**
 * Navbar component for the website
 * Includes responsive mobile menu and authentication links
 */
export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  // Handle scroll effect for sticky navbar
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Home', href: '/landingpage' },
    { name: 'Features', href: '/landingpage#features' },
    { name: 'About', href: '/landingpage#about' },
    { name: 'Contact', href: '/landingpage#contact' },
  ];

  return (
    <nav
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        isScrolled ? 'bg-white/90 backdrop-blur-md shadow-sm' : 'bg-white'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Logo */}
          <Link href="/landingpage" className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-primary">Guntar-NextJS</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  pathname === item.href ? 'text-primary' : 'text-gray-700'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Authentication Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {!isLoading && !isAuthenticated ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/register">Register</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 px-2 space-y-4 border-t">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`block py-2 text-base font-medium transition-colors hover:text-primary ${
                  pathname === item.href ? 'text-primary' : 'text-gray-700'
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-200 flex flex-col space-y-3">
              {!isLoading && !isAuthenticated ? (
                <>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/auth/login">Login</Link>
                  </Button>
                  <Button asChild className="w-full">
                    <Link href="/auth/register">Register</Link>
                  </Button>
                </>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
