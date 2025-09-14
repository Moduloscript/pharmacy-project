import { cn } from '@ui/lib';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  MessageCircle 
} from 'lucide-react';
import type { PrescriptionStatus } from '../lib/prescriptions';

interface StatusChipProps {
  status: PrescriptionStatus;
  className?: string;
}

const statusConfig = {
  PENDING_VERIFICATION: {
    label: 'Pending Verification',
    icon: Clock,
    className: 'rx-badge-pending',
  },
  APPROVED: {
    label: 'Approved',
    icon: CheckCircle,
    className: 'rx-badge-approved',
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    className: 'rx-badge-rejected',
  },
  NEEDS_CLARIFICATION: {
    label: 'Needs Clarification',
    icon: MessageCircle,
    className: 'rx-badge-clarify',
  },
};

export function StatusChip({ status, className }: StatusChipProps) {
  const config = statusConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span className={cn('rx-badge', config.className, className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}