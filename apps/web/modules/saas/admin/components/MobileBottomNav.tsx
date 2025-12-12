'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@ui/lib';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@ui/components/sheet';
import {
  LayoutDashboard,
  ShoppingCartIcon,
  UsersIcon,
  PackageIcon,
  MoreHorizontal,
  FileTextIcon,
  Building2Icon,
  BoxIcon,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
}

// Primary navigation items (shown in bottom bar)
const primaryNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/app/admin',
    icon: <LayoutDashboard className="size-5" />,
  },
  {
    title: 'Orders',
    href: '/app/admin/orders',
    icon: <ShoppingCartIcon className="size-5" />,
  },
  {
    title: 'Customers',
    href: '/app/admin/customers',
    icon: <UsersIcon className="size-5" />,
  },
  {
    title: 'Inventory',
    href: '/app/admin/inventory',
    icon: <PackageIcon className="size-5" />,
  },
];

// Secondary navigation items (shown in "More" menu)
const secondaryNavItems: NavItem[] = [
  {
    title: 'Users',
    href: '/app/admin/users',
    icon: <UsersIcon className="size-5" />,
  },
  {
    title: 'Prescriptions',
    href: '/app/admin/prescriptions',
    icon: <FileTextIcon className="size-5" />,
  },
  {
    title: 'Products',
    href: '/app/admin/products',
    icon: <BoxIcon className="size-5" />,
  },
  {
    title: 'Organizations',
    href: '/app/admin/organizations',
    icon: <Building2Icon className="size-5" />,
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/app/admin') {
      return pathname === '/app/admin';
    }
    return pathname.startsWith(href);
  };

  const isMoreActive = secondaryNavItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Fixed bottom navigation bar - mobile only */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {primaryNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
                isActive(item.href)
                  ? 'text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span
                className={cn(
                  'rounded-lg p-1 transition-colors',
                  isActive(item.href) && 'bg-primary/10'
                )}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.title}</span>
            </Link>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors',
              isMoreActive
                ? 'text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span
              className={cn(
                'rounded-lg p-1 transition-colors',
                isMoreActive && 'bg-primary/10'
              )}
            >
              <MoreHorizontal className="size-5" />
            </span>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More menu bottom sheet */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh] rounded-t-xl">
          <SheetHeader className="pb-4">
            <SheetTitle>More Options</SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-2 gap-3 pb-6">
            {secondaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 transition-colors',
                  isActive(item.href)
                    ? 'border-primary bg-primary/5 text-primary font-medium'
                    : 'border-border hover:bg-muted'
                )}
              >
                {item.icon}
                <span className="text-sm">{item.title}</span>
              </Link>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </>
  );
}
