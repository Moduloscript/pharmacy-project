'use client'

import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card'
import { Alert, AlertDescription } from '@ui/components/alert'
import { Label } from '@ui/components/label'
import { Textarea } from '@ui/components/textarea'
import { Input } from '@ui/components/input'
import { Upload, FileText, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useToast } from '@ui/hooks/use-toast'
import { apiClient } from '@shared/lib/api-client'
import { format } from 'date-fns'
import { useSignedUploadUrlMutation } from '../../shared/lib/api'
import { useSession } from '../../auth/hooks/use-session'

interface PrescriptionUploadProps {
  orderId: string
  onSuccess?: () => void
}

export function PrescriptionUpload({ orderId, onSuccess }: PrescriptionUploadProps) {
  const { toast } = useToast()
  const { user } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [prescribedBy, setPrescribedBy] = useState('')
  const [prescribedDate, setPrescribedDate] = useState('')
  const [preview, setPreview] = useState<string | null>(null)

  const createPrescriptionMutation = useMutation({
    mutationFn: async ({ data, csrfToken }: { data: any; csrfToken: string }) => {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      
      if (!response.ok) {
        throw new Error('Failed to create prescription')
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      const newId = data?.data?.prescription?.id
      if (file && newId) {
        // Upload file after creating prescription
        uploadFileMutation.mutate({
          prescriptionId: newId,
          file,
          csrfToken: variables.csrfToken,
        })
      } else {
        toast({
          title: 'Success',
          description: 'Prescription submitted successfully',
        })
        onSuccess?.()
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to submit prescription. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const signedUploadUrlMutation = useSignedUploadUrlMutation()
  
  const uploadFileMutation = useMutation({
    mutationFn: async ({ prescriptionId, file }: { prescriptionId: string; file: File }) => {
      console.log('🚀 Starting prescription upload process...');
      console.log('File:', file.name, file.type, file.size);
      
      // Step 1: Get signed upload URL
      const timestamp = Date.now()
      const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf'
      const path = `${user?.id || 'anonymous'}/${prescriptionId}/${timestamp}.${ext}`
      console.log('📁 Storage path:', path);
      
      try {
        console.log('🔑 Getting signed upload URL...');
        const { signedUrl } = await signedUploadUrlMutation.mutateAsync({
          bucket: process.env.NEXT_PUBLIC_PRESCRIPTIONS_BUCKET_NAME || 'prescriptions',
          path,
          contentType: file.type
        })
        console.log('✅ Got signed URL:', signedUrl.substring(0, 100) + '...');
        
        // Step 2: Upload file to storage
        console.log('📤 Uploading file to Supabase storage...');
        const uploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type,
          },
        })
        
        console.log('Upload response status:', uploadResponse.status);
        console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          console.error('❌ Upload failed:', errorText);
          throw new Error(`Failed to upload file to storage: ${uploadResponse.status} - ${errorText}`)
        }
        console.log('✅ File uploaded to storage successfully');
      } catch (error) {
        console.error('❌ Error during upload:', error);
        throw error;
      }
      
      // Step 3: Update prescription with document key
      console.log('🔄 Updating prescription record with document key...');
      const csrfResp = await fetch('/api/prescriptions/csrf', { credentials: 'include' })
      const csrfToken = csrfResp.headers.get('X-CSRF-Token') || (await csrfResp.json()).csrfToken
      console.log('Got CSRF token:', csrfToken ? 'Yes' : 'No');
      
      const updatePayload = {
        documentKey: path,
        fileName: file.name,
        fileSize: file.size
      };
      console.log('Update payload:', updatePayload);
      
      const response = await fetch(`/api/prescriptions/${prescriptionId}/document`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify(updatePayload),
        credentials: 'include',
      })
      
      console.log('Update response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update failed:', errorText);
        throw new Error(`Failed to update prescription: ${response.status}`)
      }
      console.log('✅ Prescription record updated with document key');
      
      return response.json()
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Prescription uploaded successfully',
      })
      onSuccess?.()
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload prescription file. Please try again.',
        variant: 'destructive',
      })
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB

    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a JPEG, PNG, WebP, or PDF file',
        variant: 'destructive',
      })
      return
    }

    if (selectedFile.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'File size must be less than 10MB',
        variant: 'destructive',
      })
      return
    }

    setFile(selectedFile)

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setPreview(null)
    }
  }

  const handleSubmit = async () => {
    const data = {
      orderId,
      notes,
      prescribedBy,
      prescribedDate: prescribedDate ? new Date(prescribedDate).toISOString() : undefined,
    }

    // Obtain CSRF token before submitting
    const tokenResp = await fetch('/api/prescriptions/csrf', { credentials: 'include' })
    const csrfToken = tokenResp.headers.get('X-CSRF-Token') || (await tokenResp.json().catch(() => ({}))).csrfToken

    if (!csrfToken) {
      toast({ title: 'Security error', description: 'Unable to get CSRF token. Please try again.', variant: 'destructive' })
      return
    }

    createPrescriptionMutation.mutate({ data, csrfToken })
  }

  const handleRemoveFile = () => {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isLoading = createPrescriptionMutation.isPending || uploadFileMutation.isPending

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Prescription</CardTitle>
        <CardDescription>
          Please upload your prescription for the items that require it
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Your order contains prescription-required items. Please upload a valid prescription
            from a licensed healthcare provider to proceed.
          </AlertDescription>
        </Alert>

        {/* File Upload */}
        <div>
          <Label htmlFor="prescription-file">Prescription Document</Label>
          <div className="mt-2">
            {!file ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP, or PDF (max 10MB)
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {preview ? (
                      <img
                        src={preview}
                        alt="Prescription preview"
                        className="w-20 h-20 object-cover rounded"
                      />
                    ) : (
                      <FileText className="w-10 h-10 text-gray-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="prescription-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Prescription Details */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="prescribed-by">Prescribed By (Doctor's Name)</Label>
            <Input
              id="prescribed-by"
              value={prescribedBy}
              onChange={(e) => setPrescribedBy(e.target.value)}
              placeholder="Dr. John Doe"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="prescribed-date">Prescription Date</Label>
            <Input
              id="prescribed-date"
              type="date"
              value={prescribedDate}
              onChange={(e) => setPrescribedDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information about the prescription..."
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Uploading...' : 'Submit Prescription'}
        </Button>

        <div className="text-sm text-gray-500">
          <p className="font-medium mb-1">Important Notes:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Prescription must be from a licensed healthcare provider</li>
            <li>Prescription should clearly show the prescribed medications</li>
            <li>Prescription must be current and not expired</li>
            <li>All information must be legible</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
