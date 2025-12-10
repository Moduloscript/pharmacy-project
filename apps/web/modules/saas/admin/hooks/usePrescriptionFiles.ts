import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@shared/lib/api-client'

interface PrescriptionFile {
  url: string
  uploadedAt: string
  type: 'image' | 'pdf' | 'unknown'
}

export function usePrescriptionFiles(prescriptionId: string | null) {
  return useQuery({
    queryKey: ['prescription-files', prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return []
      
      const response = await (apiClient as any).prescriptions[':prescriptionId'].file.$get({
        param: { prescriptionId }
      })
      
      if (!response.ok) {
        return []
      }

      const json = await response.json()
      
      if (!json.success || !json.data) {
        return []
      }

      const file = json.data
      
      // Determine file type from URL or mime type
      const type = file.contentType?.includes('pdf') || file.url.endsWith('.pdf') ? 'pdf' : 
                   (file.contentType?.includes('image') || file.url.match(/\.(jpg|jpeg|png|webp)$/i)) ? 'image' : 
                   'unknown'

      return [{
        url: file.url,
        // use lastModified if available, otherwise current time as fallback (though misleading, better than empty)
        uploadedAt: file.lastModified || new Date().toISOString(),
        type
      }] as PrescriptionFile[]
    },
    enabled: !!prescriptionId,
    refetchInterval: 60 * 60 * 1000, // Refresh every hour for new signed URLs
  })
}
