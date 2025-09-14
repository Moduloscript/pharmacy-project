import { useQuery } from '@tanstack/react-query'
import { api } from '@web/lib/api'

interface PrescriptionFile {
  url: string
  uploadedAt: string
  type: 'image' | 'pdf' | 'unknown'
}

export function usePrescriptionFiles(prescriptionId: string | null) {
  return useQuery({
    queryKey: ['prescription-files', prescriptionId],
    queryFn: async () => {
      if (!prescriptionId) return null
      
      const response = await api.get(`/prescriptions/${prescriptionId}/files`)
      const files = response.data.files || []
      
      // Determine file type from URL or mime type
      return files.map((file: any) => ({
        ...file,
        type: file.url.endsWith('.pdf') ? 'pdf' : 
              file.url.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 
              'unknown'
      })) as PrescriptionFile[]
    },
    enabled: !!prescriptionId,
    refetchInterval: 60 * 60 * 1000, // Refresh every hour for new signed URLs
  })
}
