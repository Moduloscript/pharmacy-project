'use client'

import { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Button } from '@ui/components/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@ui/components/card'
import { Alert, AlertDescription } from '@ui/components/alert'
import { Label } from '@ui/components/label'
import { Upload, FileText, AlertCircle, X } from 'lucide-react'
import { useToast } from '@ui/hooks/use-toast'
import { format } from 'date-fns'

export interface CheckoutPrescriptionFile {
  file: File
  preview?: string | null
  prescribedBy?: string
  prescribedDate?: string
  notes?: string
}

export interface CheckoutPrescriptionUploadRef {
  getFiles: () => CheckoutPrescriptionFile[]
  reset: () => void
}

interface CheckoutPrescriptionUploadProps {
  onFilesChange?: (files: CheckoutPrescriptionFile[]) => void
  compact?: boolean // For inline display in checkout form
}

export const CheckoutPrescriptionUpload = forwardRef<
  CheckoutPrescriptionUploadRef,
  CheckoutPrescriptionUploadProps
>(({ onFilesChange, compact = false }, ref) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<CheckoutPrescriptionFile[]>([])

  useImperativeHandle(ref, () => ({
    getFiles: () => files,
    reset: () => {
      setFiles([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }))

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    if (selectedFiles.length === 0) return

    // Validate files
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: 'Invalid file type',
          description: `${file.name} is not a valid file type. Please upload JPEG, PNG, WebP, or PDF files.`,
          variant: 'destructive',
        })
        continue
      }

      if (file.size > maxSize) {
        toast({
          title: 'File too large',
          description: `${file.name} is too large. File size must be less than 10MB.`,
          variant: 'destructive',
        })
        continue
      }

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const newFile: CheckoutPrescriptionFile = {
            file,
            preview: e.target?.result as string,
          }
          // Use setTimeout to defer state update
          setTimeout(() => {
            setFiles(prev => {
              const updated = [...prev.filter(f => f.file.name !== file.name), newFile]
              onFilesChange?.(updated)
              return updated
            })
          }, 0)
        }
        reader.readAsDataURL(file)
      } else {
        const newFile: CheckoutPrescriptionFile = { file, preview: null }
        // Use setTimeout to defer state update
        setTimeout(() => {
          setFiles(prev => {
            const updated = [...prev.filter(f => f.file.name !== file.name), newFile]
            onFilesChange?.(updated)
            return updated
          })
        }, 0)
      }
    }
  }, [toast, onFilesChange])

  const handleRemoveFile = useCallback((fileName: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.file.name !== fileName)
      // Defer the callback to avoid render-time state updates
      setTimeout(() => {
        onFilesChange?.(updated)
      }, 0)
      return updated
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [onFilesChange])

  if (compact) {
    // Compact view for inline display in checkout form
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="prescription-file">Prescription Document</Label>
          <div className="mt-2">
            {files.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-gray-400 transition-colors"
              >
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <p className="mt-2 text-sm text-gray-600">
                  Click to upload prescription
                </p>
                <p className="text-xs text-gray-500">
                  JPEG, PNG, WebP, or PDF (max 10MB)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((item) => (
                  <div key={item.file.name} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {item.preview ? (
                          <img
                            src={item.preview}
                            alt="Prescription preview"
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <FileText className="w-8 h-8 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{item.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(item.file.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  Add Another Prescription
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              id="prescription-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
          </div>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Prescription will be uploaded and verified after order creation.
            You can also upload it later from your order page.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // Full card view (not used in checkout, but available if needed)
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
            {files.length === 0 ? (
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
              <div className="space-y-2">
                {files.map((item) => (
                  <div key={item.file.name} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {item.preview ? (
                          <img
                            src={item.preview}
                            alt="Prescription preview"
                            className="w-20 h-20 object-cover rounded"
                          />
                        ) : (
                          <FileText className="w-10 h-10 text-gray-400" />
                        )}
                        <div>
                          <p className="text-sm font-medium">{item.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(item.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(item.file.name)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              id="prescription-file"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
              multiple
            />
          </div>
        </div>

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
})

CheckoutPrescriptionUpload.displayName = 'CheckoutPrescriptionUpload'