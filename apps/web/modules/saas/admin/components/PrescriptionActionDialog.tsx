"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ui/components/dialog'
import { Button } from '@ui/components/button'
import { Textarea } from '@ui/components/textarea'
import { Label } from '@ui/components/label'
import { AlertCircle, CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface PrescriptionActionDialogProps {
  isOpen: boolean
  onClose: () => void
  action: 'approve' | 'reject' | 'clarify' | null
  prescriptionId: string
  orderNumber: string
  onConfirm: (data: {
    status: 'APPROVED' | 'REJECTED' | 'CLARIFICATION_REQUESTED'
    rejectionReason?: string
    clarificationRequest?: string
    notes?: string
  }) => Promise<void>
}

export function PrescriptionActionDialog({
  isOpen,
  onClose,
  action,
  prescriptionId,
  orderNumber,
  onConfirm,
}: PrescriptionActionDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [clarificationRequest, setClarificationRequest] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleConfirm = async () => {
    setError('')
    
    // Validate required fields
    if (action === 'reject' && !rejectionReason.trim()) {
      setError('Please provide a reason for rejection')
      return
    }
    
    if (action === 'clarify' && !clarificationRequest.trim()) {
      setError('Please specify what clarification is needed')
      return
    }

    setIsSubmitting(true)
    
    try {
      const baseData = {
        notes: notes.trim() || undefined
      };

      let data: any; // Using explicit any temporarily to satisfy the strictly typed onConfirm until we refactor the props

      if (action === 'approve') {
        data = { ...baseData, status: 'APPROVED' };
      } else if (action === 'reject') {
        data = { ...baseData, status: 'REJECTED', rejectionReason: rejectionReason.trim() };
      } else if (action === 'clarify') {
        data = { ...baseData, status: 'CLARIFICATION_REQUESTED', clarificationRequest: clarificationRequest.trim() };
      }

      if (data) {
        await onConfirm(data);
      }
      
      // Reset form
      setRejectionReason('')
      setClarificationRequest('')
      setNotes('')
      onClose()
    } catch (err) {
      setError('Failed to update prescription. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('')
      setClarificationRequest('')
      setNotes('')
      setError('')
      onClose()
    }
  }

  const getDialogTitle = () => {
    switch (action) {
      case 'approve':
        return 'Approve Prescription'
      case 'reject':
        return 'Reject Prescription'
      case 'clarify':
        return 'Request Clarification'
      default:
        return 'Prescription Action'
    }
  }

  const getDialogDescription = () => {
    switch (action) {
      case 'approve':
        return `You are about to approve the prescription for Order #${orderNumber}. The order will proceed to processing.`
      case 'reject':
        return `You are about to reject the prescription for Order #${orderNumber}. The customer will be notified and the order will be cancelled.`
      case 'clarify':
        return `Request additional information about the prescription for Order #${orderNumber}. The customer will be notified to provide clarification.`
      default:
        return ''
    }
  }

  const getIcon = () => {
    switch (action) {
      case 'approve':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'reject':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'clarify':
        return <HelpCircle className="h-5 w-5 text-yellow-500" />
      default:
        return null
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getIcon()}
            {getDialogTitle()}
          </DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {action === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="rejectionReason" className="text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Please provide a clear reason for rejection..."
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This reason will be shared with the customer
              </p>
            </div>
          )}

          {action === 'clarify' && (
            <div className="space-y-2">
              <Label htmlFor="clarificationRequest" className="text-sm font-medium">
                Clarification Request <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="clarificationRequest"
                value={clarificationRequest}
                onChange={(e) => setClarificationRequest(e.target.value)}
                placeholder="What additional information do you need from the customer?"
                className="min-h-[100px]"
                disabled={isSubmitting}
              />
              <p className="text-xs text-muted-foreground">
                This message will be sent to the customer
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Internal Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes about this prescription..."
              className="min-h-[80px]"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              These notes are for internal use only
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            variant={action === 'reject' ? 'error' : 'primary'}
          >
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
