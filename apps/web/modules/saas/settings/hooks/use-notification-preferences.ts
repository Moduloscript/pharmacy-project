import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../lib/notification-api';
import type { NotificationPreferences } from '@repo/database';
import { toast } from 'sonner';

const queryKey = ['notification-preferences'];

export function useNotificationPreferences() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey,
    queryFn: notificationApi.getPreferences,
  });

  const { mutate, isPending } = useMutation<NotificationPreferences, Error, Partial<NotificationPreferences>>({
    mutationFn: notificationApi.updatePreferences,
    onSuccess: (updatedPreferences) => {
      queryClient.setQueryData(queryKey, updatedPreferences);
      toast.success('Notification settings updated!');
    },
    onError: () => {
      toast.error('Could not save your settings. Please try again.');
    },
  });

  return {
    preferences: data,
    isLoading,
    isError,
    updatePreferences: mutate,
    isUpdating: isPending,
  };
}

