import { atom, useAtom } from 'jotai';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchAdminPrescriptions,
  updatePrescriptionStatus,
  type AdminPrescription,
  type PrescriptionStatus,
} from '../lib/prescriptions';

// Jotai atoms for filters
export const prescriptionStatusAtom = atom<PrescriptionStatus>('PENDING_VERIFICATION');

export function useAdminPrescriptions() {
  const [status, setStatus] = useAtom(prescriptionStatusAtom);
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: ['admin-prescriptions', status],
    queryFn: ({ pageParam = 1 }) => fetchAdminPrescriptions({ page: pageParam, limit: 10, status }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.pages) {
        return lastPage.pagination.page + 1;
        }
      return undefined;
    },
  });

  const prescriptions: AdminPrescription[] =
    query.data?.pages.flatMap((p) => p.prescriptions) ?? [];

  const mutation = useMutation({
    mutationFn: ({ id, nextStatus, rejectionReason, notes }: { id: string; nextStatus: PrescriptionStatus; rejectionReason?: string; notes?: string }) =>
      updatePrescriptionStatus(id, { status: nextStatus, rejectionReason, notes }),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['admin-prescriptions'] });
    },
  });

  return {
    status,
    setStatus,
    prescriptions,
    isLoading: query.isLoading,
    isError: query.isError,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    updateStatus: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
