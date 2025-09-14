"use client"

import { useSession } from '@saas/auth/hooks/use-session'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export type UserRole = 'user' | 'admin' | 'pharmacist'

interface UseRoleAccessOptions {
  allowedRoles: UserRole[]
  redirectTo?: string
  onAccessDenied?: () => void
}

export function useRoleAccess({
  allowedRoles,
  redirectTo = '/app',
  onAccessDenied
}: UseRoleAccessOptions) {
  const session = useSession()
  const router = useRouter()

  const userRole = session?.user?.role as UserRole | undefined
  const hasAccess = userRole && allowedRoles.includes(userRole)

  useEffect(() => {
    if (session && !hasAccess) {
      if (onAccessDenied) {
        onAccessDenied()
      }
      router.push(redirectTo)
    }
  }, [session, hasAccess, redirectTo, router, onAccessDenied])

  return {
    hasAccess,
    userRole,
    isLoading: !session,
    isAuthenticated: !!session
  }
}

// Utility function to check if user has specific permissions
export function usePermission(permission: string) {
  const session = useSession()
  const userRole = session?.user?.role

  // Define permission mappings
  const rolePermissions: Record<string, string[]> = {
    admin: [
      'prescriptions.view',
      'prescriptions.approve',
      'prescriptions.reject',
      'prescriptions.clarify',
      'orders.view',
      'orders.edit',
      'customers.view',
      'customers.edit',
      'products.view',
      'products.edit',
      'users.view',
      'users.edit',
      'settings.view',
      'settings.edit'
    ],
    pharmacist: [
      'prescriptions.view',
      'prescriptions.approve',
      'prescriptions.reject',
      'prescriptions.clarify',
      'orders.view'
    ],
    user: [
      'orders.view.own',
      'prescriptions.view.own',
      'profile.view',
      'profile.edit'
    ]
  }

  const userPermissions = userRole ? rolePermissions[userRole] || [] : []
  
  return {
    hasPermission: userPermissions.includes(permission),
    userRole,
    isLoading: !session
  }
}
