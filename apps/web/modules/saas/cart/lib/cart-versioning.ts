'use client'

import { atom } from 'jotai'

/**
 * Cart versioning system for handling concurrent sessions and preventing stale data issues
 * Enables proper cart sync across tabs and prevents data conflicts
 */

export interface CartVersion {
  version: number
  timestamp: Date
  sessionId: string
  tabId: string
  lastModifiedBy: string
  checksum: string
  conflictResolutionStrategy: 'merge' | 'override' | 'prompt'
}

export interface CartOperation {
  id: string
  type: 'add' | 'update' | 'remove' | 'clear' | 'checkout' | 'payment'
  timestamp: Date
  sessionId: string
  tabId: string
  data: any
  version: number
  applied: boolean
}

export interface CartConflict {
  localVersion: CartVersion
  remoteVersion: CartVersion
  conflicts: ConflictItem[]
  resolutionStrategy: 'merge' | 'override' | 'prompt'
}

export interface ConflictItem {
  field: string
  localValue: any
  remoteValue: any
  timestamp: Date
  severity: 'low' | 'medium' | 'high'
}

// Cart versioning atoms
export const cartVersionAtom = atom<CartVersion>({
  version: 1,
  timestamp: new Date(),
  sessionId: '',
  tabId: '',
  lastModifiedBy: '',
  checksum: '',
  conflictResolutionStrategy: 'merge'
})

export const cartOperationsHistoryAtom = atom<CartOperation[]>([])

export const pendingConflictsAtom = atom<CartConflict[]>([])

/**
 * Cart versioning manager for handling concurrent access and data integrity
 */
export class CartVersioningManager {
  private static instance: CartVersioningManager
  private readonly STORAGE_KEY = 'cart_versioning'
  private readonly OPERATIONS_KEY = 'cart_operations'
  private syncInterval: NodeJS.Timeout | null = null

  private constructor() {}

  public static getInstance(): CartVersioningManager {
    if (!CartVersioningManager.instance) {
      CartVersioningManager.instance = new CartVersioningManager()
    }
    return CartVersioningManager.instance
  }

  /**
   * Initialize versioning system
   */
  public initialize(): void {
    if (typeof window === 'undefined') return

    // Set up storage event listener for cross-tab sync
    window.addEventListener('storage', this.handleStorageChange.bind(this))

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.syncWithStorage()
    }, 5000) // Sync every 5 seconds

    console.log('Cart versioning manager initialized')
  }

  /**
   * Cleanup versioning system
   */
  public cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageChange.bind(this))
    }
  }

  /**
   * Create a new cart version
   */
  public createVersion(
    sessionId: string, 
    tabId: string, 
    cartData: any,
    operation: CartOperation['type'] = 'update'
  ): CartVersion {
    const now = new Date()
    const checksum = this.calculateChecksum(cartData)
    
    const currentVersion = this.getCurrentVersion()
    const newVersion: CartVersion = {
      version: currentVersion.version + 1,
      timestamp: now,
      sessionId,
      tabId,
      lastModifiedBy: `${sessionId}:${tabId}`,
      checksum,
      conflictResolutionStrategy: 'merge'
    }

    // Store operation in history
    const operationRecord: CartOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: operation,
      timestamp: now,
      sessionId,
      tabId,
      data: cartData,
      version: newVersion.version,
      applied: true
    }

    this.saveVersion(newVersion)
    this.saveOperation(operationRecord)

    return newVersion
  }

  /**
   * Check if local version conflicts with remote version
   */
  public checkForConflicts(localVersion: CartVersion, localData: any): CartConflict | null {
    const remoteVersion = this.getCurrentVersion()
    
    if (localVersion.version === remoteVersion.version) {
      return null // No conflict
    }

    // Check if versions are from same session (different tabs)
    if (localVersion.sessionId === remoteVersion.sessionId) {
      // Same session, merge automatically
      return null
    }

    const remoteData = this.getCartDataFromStorage()
    const conflicts = this.detectDataConflicts(localData, remoteData)

    if (conflicts.length === 0) {
      return null // No actual data conflicts
    }

    return {
      localVersion,
      remoteVersion,
      conflicts,
      resolutionStrategy: this.determineResolutionStrategy(conflicts)
    }
  }

  /**
   * Resolve cart conflicts
   */
  public resolveConflict(
    conflict: CartConflict,
    strategy: 'merge' | 'override' | 'keep_local',
    localData: any,
    remoteData: any
  ): any {
    switch (strategy) {
      case 'merge':
        return this.mergeCartData(localData, remoteData, conflict)
      
      case 'override':
        return remoteData // Use remote data
      
      case 'keep_local':
        return localData // Keep local data
      
      default:
        return this.mergeCartData(localData, remoteData, conflict)
    }
  }

  /**
   * Sync local cart with storage
   */
  public syncWithStorage(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const remoteVersion = this.getCurrentVersion()
      const localVersion = this.getLocalVersion()
      
      if (!localVersion || localVersion.version < remoteVersion.version) {
        // Local is behind, need to sync
        this.handleVersionUpdate(remoteVersion)
        return true
      }
      
      return false
    } catch (error) {
      console.error('Error syncing cart version:', error)
      return false
    }
  }

  /**
   * Get current version from storage
   */
  private getCurrentVersion(): CartVersion {
    if (typeof window === 'undefined') {
      return this.getDefaultVersion()
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        const version = JSON.parse(stored)
        return {
          ...version,
          timestamp: new Date(version.timestamp)
        }
      }
    } catch (error) {
      console.error('Error reading cart version:', error)
    }

    return this.getDefaultVersion()
  }

  /**
   * Get local version (in memory)
   */
  private getLocalVersion(): CartVersion | null {
    // This would be retrieved from the atom state
    // For now, return null to indicate no local version cached
    return null
  }

  /**
   * Save version to storage
   */
  private saveVersion(version: CartVersion): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(version))
      
      // Dispatch custom event for other tabs
      window.dispatchEvent(new CustomEvent('cart-version-updated', {
        detail: version
      }))
    } catch (error) {
      console.error('Error saving cart version:', error)
    }
  }

  /**
   * Save operation to history
   */
  private saveOperation(operation: CartOperation): void {
    if (typeof window === 'undefined') return

    try {
      const operations = this.getOperationHistory()
      operations.push(operation)
      
      // Keep only last 50 operations
      const recentOperations = operations.slice(-50)
      
      localStorage.setItem(this.OPERATIONS_KEY, JSON.stringify(recentOperations))
    } catch (error) {
      console.error('Error saving cart operation:', error)
    }
  }

  /**
   * Get operation history
   */
  private getOperationHistory(): CartOperation[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(this.OPERATIONS_KEY)
      if (stored) {
        const operations = JSON.parse(stored)
        return operations.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp)
        }))
      }
    } catch (error) {
      console.error('Error reading operation history:', error)
    }

    return []
  }

  /**
   * Handle storage changes from other tabs
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === this.STORAGE_KEY && event.newValue) {
      try {
        const newVersion = JSON.parse(event.newValue)
        this.handleVersionUpdate({
          ...newVersion,
          timestamp: new Date(newVersion.timestamp)
        })
      } catch (error) {
        console.error('Error handling storage change:', error)
      }
    }
  }

  /**
   * Handle version update from remote source
   */
  private handleVersionUpdate(remoteVersion: CartVersion): void {
    // Dispatch event to notify components of version change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('cart-remote-update', {
        detail: { version: remoteVersion }
      }))
    }
  }

  /**
   * Calculate checksum for cart data
   */
  private calculateChecksum(data: any): string {
    // Simple checksum based on JSON string
    const jsonString = JSON.stringify(data, Object.keys(data).sort())
    let hash = 0
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    return hash.toString(36)
  }

  /**
   * Detect conflicts between local and remote data
   */
  private detectDataConflicts(localData: any, remoteData: any): ConflictItem[] {
    const conflicts: ConflictItem[] = []

    // Compare cart items
    if (localData.items && remoteData.items) {
      const localItemMap = new Map(localData.items.map((item: any) => [item.id, item]))
      const remoteItemMap = new Map(remoteData.items.map((item: any) => [item.id, item]))

      // Check for quantity conflicts
      localItemMap.forEach((localItem, id) => {
        const remoteItem = remoteItemMap.get(id)
        if (remoteItem && localItem.quantity !== remoteItem.quantity) {
          conflicts.push({
            field: `items.${id}.quantity`,
            localValue: localItem.quantity,
            remoteValue: remoteItem.quantity,
            timestamp: new Date(),
            severity: 'medium'
          })
        }
      })
    }

    return conflicts
  }

  /**
   * Determine resolution strategy based on conflicts
   */
  private determineResolutionStrategy(conflicts: ConflictItem[]): 'merge' | 'override' | 'prompt' {
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high')
    
    if (highSeverityConflicts.length > 0) {
      return 'prompt' // User needs to decide
    }
    
    return 'merge' // Auto-merge for low/medium conflicts
  }

  /**
   * Merge cart data with conflict resolution
   */
  private mergeCartData(localData: any, remoteData: any, conflict: CartConflict): any {
    const merged = { ...localData }

    // Merge items by taking latest timestamp or higher quantity
    if (localData.items && remoteData.items) {
      const itemMap = new Map()

      // Add local items
      localData.items.forEach((item: any) => {
        itemMap.set(item.id, item)
      })

      // Merge remote items
      remoteData.items.forEach((remoteItem: any) => {
        const localItem = itemMap.get(remoteItem.id)
        
        if (!localItem) {
          // Item only exists remotely
          itemMap.set(remoteItem.id, remoteItem)
        } else {
          // Item exists in both, merge
          const mergedItem = {
            ...localItem,
            quantity: Math.max(localItem.quantity, remoteItem.quantity), // Take higher quantity
            addedAt: new Date(Math.min(
              new Date(localItem.addedAt).getTime(),
              new Date(remoteItem.addedAt).getTime()
            )) // Take earlier add time
          }
          itemMap.set(remoteItem.id, mergedItem)
        }
      })

      merged.items = Array.from(itemMap.values())
    }

    return merged
  }

  /**
   * Get cart data from storage
   */
  private getCartDataFromStorage(): any {
    if (typeof window === 'undefined') return {}

    try {
      const stored = localStorage.getItem('cart-storage')
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error('Error reading cart data:', error)
      return {}
    }
  }

  /**
   * Get default version
   */
  private getDefaultVersion(): CartVersion {
    return {
      version: 1,
      timestamp: new Date(),
      sessionId: '',
      tabId: '',
      lastModifiedBy: '',
      checksum: '',
      conflictResolutionStrategy: 'merge'
    }
  }
}

// Export singleton instance
export const cartVersioningManager = CartVersioningManager.getInstance()

/**
 * Hook for React components to use cart versioning
 */
export const useCartVersioning = () => {
  const manager = cartVersioningManager

  const createVersion = (sessionId: string, tabId: string, cartData: any, operation?: CartOperation['type']) => {
    return manager.createVersion(sessionId, tabId, cartData, operation)
  }

  const checkConflicts = (localVersion: CartVersion, localData: any) => {
    return manager.checkForConflicts(localVersion, localData)
  }

  const resolveConflict = (conflict: CartConflict, strategy: 'merge' | 'override' | 'keep_local', localData: any, remoteData: any) => {
    return manager.resolveConflict(conflict, strategy, localData, remoteData)
  }

  const syncWithStorage = () => {
    return manager.syncWithStorage()
  }

  return {
    createVersion,
    checkConflicts,
    resolveConflict,
    syncWithStorage,
    initialize: () => manager.initialize(),
    cleanup: () => manager.cleanup()
  }
}
