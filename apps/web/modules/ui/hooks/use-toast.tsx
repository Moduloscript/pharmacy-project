'use client';

import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const toast = (options: ToastOptions) => {
    const { title, description, variant = 'default', duration = 5000, action } = options;
    
    const message = title || description || '';
    const descriptionText = title && description ? description : undefined;

    switch (variant) {
      case 'destructive':
        sonnerToast.error(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
        break;
      case 'success':
        sonnerToast.success(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
        break;
      default:
        sonnerToast(message, {
          description: descriptionText,
          duration,
          action: action ? {
            label: action.label,
            onClick: action.onClick,
          } : undefined,
        });
    }
  };

  return { toast };
};
