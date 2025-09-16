'use client';

import { useQuery } from '@tanstack/react-query';
import { FileText } from 'lucide-react';

interface PrescriptionThumbnailProps {
  prescriptionId: string;
}

function isImageUrl(url: string | undefined): boolean {
  if (!url) return false;
  return /(\.jpg|\.jpeg|\.png|\.gif|\.webp)(\?|$)/i.test(url);
}

export function PrescriptionThumbnail({ prescriptionId }: PrescriptionThumbnailProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['rx-thumb', prescriptionId],
    queryFn: async () => {
      // Prefer redirect for thumbnail <img src> to avoid CORS and signed URL parsing bugs
      // We still call /files to check existence; if it fails we fallback to redirect URL
      try {
        const res = await fetch(`/api/prescriptions/${prescriptionId}/files`, { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          const url: string | undefined = json?.data?.files?.[0]?.url;
          return { url: url ?? `/api/prescriptions/${prescriptionId}/file/redirect` } as { url?: string } | null;
        }
      } catch {}
      return { url: `/api/prescriptions/${prescriptionId}/file/redirect` } as { url?: string } | null;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const url = data?.url;

  if (isLoading) {
    return <div className="h-10 w-10 rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse border" />;
  }

  if (isImageUrl(url)) {
    return (
      <img
        src={url}
        alt="Prescription thumbnail"
        className="h-10 w-10 rounded-md object-cover border"
        loading="lazy"
      />
    );
  }

  // Fallback for non-image or missing files
  return (
    <div className="h-10 w-10 rounded-md border flex items-center justify-center text-gray-500">
      <FileText className="h-5 w-5" />
    </div>
  );
}