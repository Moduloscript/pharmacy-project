import { db } from '@repo/database'
import { PrescriptionStatus, PrescriptionAuditAction } from '@prisma/client'
import { maskSensitiveInfo } from '../utils/prescription-security'

export interface AuditLogEntry {
  userId: string
  userEmail?: string
  userName?: string
  userRole?: string
  action: PrescriptionAuditAction
  entityType: 'PRESCRIPTION'
  entityId: string
  previousState?: any
  newState?: any
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  sessionId?: string
  timestamp: Date
}

/**
 * Create an audit log entry for prescription actions
 */
export async function createPrescriptionAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    // Mask sensitive information before logging
    const maskedEntry = {
      ...entry,
      previousState: entry.previousState ? maskSensitiveInfo(entry.previousState) : undefined,
      newState: entry.newState ? maskSensitiveInfo(entry.newState) : undefined,
      metadata: entry.metadata ? maskSensitiveInfo(entry.metadata) : undefined
    }

    // Store in database
    await db.prescriptionAuditLog.create({
      data: {
        userId: maskedEntry.userId,
        userEmail: maskedEntry.userEmail,
        userName: maskedEntry.userName,
        userRole: maskedEntry.userRole,
        action: maskedEntry.action,
        entityType: maskedEntry.entityType,
        entityId: maskedEntry.entityId,
        previousValues: entry.previousState,
        newValues: entry.newState,
        metadata: {
          ...maskedEntry.metadata,
          ipAddress: maskedEntry.ipAddress,
          userAgent: maskedEntry.userAgent,
          sessionId: maskedEntry.sessionId
        },
        ipAddress: maskedEntry.ipAddress,
        userAgent: maskedEntry.userAgent,
        sessionId: maskedEntry.sessionId,
        timestamp: maskedEntry.timestamp
      }
    })

    // Log critical security events to console for monitoring
    if (isCriticalAction(maskedEntry.action)) {
      console.warn(`[SECURITY AUDIT] ${maskedEntry.action}`, {
        userId: maskedEntry.userId,
        entityId: maskedEntry.entityId,
        ipAddress: maskedEntry.ipAddress,
        timestamp: maskedEntry.timestamp
      })
    }
  } catch (error) {
    // Never let audit logging failure break the main flow
    console.error('[AUDIT ERROR] Failed to create audit log:', error)
  }
}

/**
 * Log prescription view action
 */
export async function auditPrescriptionView(
  userId: string,
  prescriptionId: string,
  context: Record<string, any>
): Promise<void> {
  await createPrescriptionAuditLog({
    userId,
    action: 'VIEW',
    entityType: 'PRESCRIPTION',
    entityId: prescriptionId,
    metadata: context,
    timestamp: new Date()
  })
}

/**
 * Log prescription status update
 */
export async function auditPrescriptionStatusUpdate(
  userId: string,
  prescriptionId: string,
  previousStatus: PrescriptionStatus,
  newStatus: PrescriptionStatus,
  context: Record<string, any>
): Promise<void> {
  // Determine specific action based on new status
  let action: PrescriptionAuditAction
  switch (newStatus) {
    case 'APPROVED':
      action = 'APPROVE'
      break
    case 'REJECTED':
      action = 'REJECT'
      break
    case 'CLARIFICATION':
      action = 'REQUEST_CLARIFICATION'
      break
    default:
      action = 'UPDATE_STATUS'
  }

  await createPrescriptionAuditLog({
    userId,
    action,
    entityType: 'PRESCRIPTION',
    entityId: prescriptionId,
    previousState: { status: previousStatus },
    newState: { status: newStatus },
    metadata: context,
    timestamp: new Date()
  })
}

/**
 * Log security-related events
 */
export async function auditSecurityEvent(
  userId: string | undefined,
  action: PrescriptionAuditAction,
  details: Record<string, any>
): Promise<void> {
  await createPrescriptionAuditLog({
    userId: userId || 'anonymous',
    action,
    entityType: 'PRESCRIPTION',
    entityId: details.entityId || 'unknown',
    metadata: details,
    timestamp: new Date()
  })
}

/**
 * Get audit trail for a prescription
 */
export async function getPrescriptionAuditTrail(
  prescriptionId: string,
  limit: number = 50
): Promise<any[]> {
  const logs = await db.prescriptionAuditLog.findMany({
    where: {
      entityType: 'PRESCRIPTION',
      entityId: prescriptionId
    },
    orderBy: {
      timestamp: 'desc'
    },
    take: limit
  })

  return logs.map(log => ({
    id: log.id,
    userId: log.userId,
    action: log.action,
    metadata: log.metadata,
    timestamp: log.timestamp
  }))
}

/**
 * Get suspicious activity for monitoring
 */
export async function getSuspiciousActivity(
  timeWindow: number = 3600000 // 1 hour default
): Promise<any[]> {
  const cutoffTime = new Date(Date.now() - timeWindow)
  
  const suspiciousActions: PrescriptionAuditAction[] = [
    'ACCESS_DENIED',
    'RATE_LIMIT_EXCEEDED',
    'VALIDATION_FAILED',
    'SECURITY_ALERT'
  ]

  const logs = await db.prescriptionAuditLog.findMany({
    where: {
      entityType: 'PRESCRIPTION',
      action: {
        in: suspiciousActions
      },
      timestamp: {
        gte: cutoffTime
      }
    },
    orderBy: {
      timestamp: 'desc'
    }
  })

  // Group by user and count occurrences
  const userActivity = new Map<string, any>()
  
  logs.forEach(log => {
    const userId = log.userId || 'anonymous'
    if (!userActivity.has(userId)) {
      userActivity.set(userId, {
        userId,
        actions: [],
        count: 0,
        firstOccurrence: log.timestamp,
        lastOccurrence: log.timestamp
      })
    }
    
    const activity = userActivity.get(userId)
    activity.actions.push({
      action: log.action,
      timestamp: log.timestamp,
      metadata: log.metadata
    })
    activity.count++
    activity.lastOccurrence = log.timestamp
  })

  // Return users with suspicious activity patterns
  return Array.from(userActivity.values())
    .filter(activity => activity.count >= 3) // 3 or more suspicious actions
    .sort((a, b) => b.count - a.count)
}

/**
 * Check if an action is critical and needs immediate attention
 */
function isCriticalAction(action: PrescriptionAuditAction): boolean {
  const criticalActions: PrescriptionAuditAction[] = [
    'SECURITY_ALERT',
    'ACCESS_DENIED',
    'BULK_UPDATE',
    'DELETE_FILE'
  ]
  
  return criticalActions.includes(action)
}

/**
 * Generate audit report for compliance
 */
export async function generateComplianceReport(
  startDate: Date,
  endDate: Date
): Promise<any> {
  const logs = await db.prescriptionAuditLog.findMany({
    where: {
      entityType: 'PRESCRIPTION',
      timestamp: {
        gte: startDate,
        lte: endDate
      }
    },
    orderBy: {
      timestamp: 'asc'
    }
  })

  // Aggregate statistics
  const stats = {
    totalActions: logs.length,
    uniqueUsers: new Set(logs.map(l => l.userId)).size,
    actionBreakdown: {} as Record<string, number>,
    dailyActivity: {} as Record<string, number>,
    topUsers: [] as any[],
    securityEvents: 0
  }

  // Count actions by type
  logs.forEach(log => {
    const action = log.action as string
    stats.actionBreakdown[action] = (stats.actionBreakdown[action] || 0) + 1
    
    // Count daily activity
    const date = log.timestamp.toISOString().split('T')[0]
    stats.dailyActivity[date] = (stats.dailyActivity[date] || 0) + 1
    
    // Count security events
    if (isCriticalAction(log.action as PrescriptionAuditAction)) {
      stats.securityEvents++
    }
  })

  // Get top users by activity
  const userCounts = new Map<string, number>()
  logs.forEach(log => {
    const count = userCounts.get(log.userId || 'anonymous') || 0
    userCounts.set(log.userId || 'anonymous', count + 1)
  })
  
  stats.topUsers = Array.from(userCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, actionCount: count }))

  return {
    reportPeriod: {
      startDate,
      endDate
    },
    statistics: stats,
    detailedLogs: logs
  }
}
