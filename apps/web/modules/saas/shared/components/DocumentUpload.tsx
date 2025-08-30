'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuid } from 'uuid';
import { config } from '@repo/config';
import { useSignedUploadUrlMutation } from '@saas/shared/lib/api';
import { apiClient } from '@shared/lib/api-client';
import { useSession } from '@saas/auth/hooks/use-session';

export type DocumentUploadResult = {
  key: string;
  file: File;
  documentId?: string;
};

export function DocumentUpload(props: {
  bucket?: string;
  prefix?: string; // path prefix inside the bucket
  ownerId?: string; // optional owner/tenant id to include in the path
  organizationId?: string; // optional organization id to persist with record
  multiple?: boolean;
  accept?: { [mime: string]: string[] };
  onUploaded?: (result: DocumentUploadResult) => void;
  className?: string;
}) {
  const {
    bucket = config.storage.bucketNames.documents,
    prefix = 'documents',
    ownerId,
    organizationId,
    multiple = true,
    accept = {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    onUploaded,
    className
  } = props;

  const { user, loaded } = useSession();

  const [uploading, setUploading] = useState(false);
  const getSignedUploadUrlMutation = useSignedUploadUrlMutation();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;
    setUploading(true);

    try {
      for (const file of acceptedFiles) {
        const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
        const key = `${prefix}/${ownerId ? ownerId + '/' : ''}${uuid()}.${ext}`;

        // 1) Request presigned URL with exact content type
        const { signedUrl } = await getSignedUploadUrlMutation.mutateAsync({
          bucket,
          path: key,
          contentType: file.type || 'application/octet-stream',
        });

        // 2) Upload directly to storage
        const put = await fetch(signedUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
        });

        if (!put.ok) {
          const text = await put.text().catch(() => '');
          throw new Error(`Upload failed (${put.status}): ${text}`);
        }

        // 3) Persist metadata via API
        const createRes = await apiClient.documents.$post({
          json: {
            name: file.name,
            key,
            mimeType: file.type || 'application/octet-stream',
            size: file.size,
            bucket,
            organizationId,
          },
        });
        if (!createRes.ok) {
          const text = await createRes.text().catch(() => '');
          throw new Error(`Failed to create document record: ${text}`);
        }
        const created = await createRes.json();

        onUploaded?.({ key, file, documentId: created.document?.id });
      }
    } catch (err) {
      console.error('Document upload error:', err);
      // Optionally bubble up an error callback in the future
    } finally {
      setUploading(false);
    }
  }, [bucket, getSignedUploadUrlMutation, ownerId, onUploaded, prefix]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept,
    disabled: !user,
  });

  if (!loaded) {
    return (
      <div className={
        'rounded-md border border-dashed p-4 text-sm ' +
        (className ?? '')
      }>
        <div className="text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={
        'rounded-md border border-dashed p-4 text-sm bg-muted/30 ' +
        (className ?? '')
      }>
        <strong>Upload documents</strong>
        <div className="mt-1 text-muted-foreground">
          Please sign in to upload documents.
        </div>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={
        'rounded-md border border-dashed p-4 text-sm ' +
        (isDragActive ? 'bg-muted/50 ' : '') +
        (uploading ? 'opacity-60 ' : '') +
        (className ?? '')
      }
    >
      <input {...getInputProps()} />
      <div>
        <strong>Upload documents</strong>
        <div className="mt-1 text-muted-foreground">
          {isDragActive ? 'Drop files here…' : 'Drag & drop files here, or click to select'}
        </div>
        {uploading && <div className="mt-2">Uploading…</div>}
      </div>
    </div>
  );
}
