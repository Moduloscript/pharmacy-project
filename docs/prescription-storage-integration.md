# Prescription File Storage Integration with Supabase

## Overview
The prescription management system now uses Supabase Storage for secure file storage with signed URLs, following the existing patterns in the codebase for document and image storage.

## ✅ Implementation Complete

### 1. **Storage Bucket Configuration**
- Created `prescriptions` bucket in Supabase Storage
- Private bucket with RLS (Row Level Security) policies
- File size limit: 10MB
- Allowed MIME types: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, `application/pdf`

### 2. **RLS Policies Implemented**
```sql
-- Users can only access their own prescription files
-- Files are organized by user ID: {userId}/{prescriptionId}/{timestamp}.{ext}
```

### 3. **Backend Services**

#### Storage Service (`prescription-storage.ts`)
- `generatePrescriptionStorageKey()` - Creates secure file paths
- `getPrescriptionUploadUrl()` - Generates signed upload URLs
- `getPrescriptionViewUrl()` - Generates signed viewing URLs with access control
- `deletePrescriptionFile()` - Secure file deletion (admin only)
- `getPrescriptionFiles()` - Retrieves all files for a prescription

#### API Endpoints
- `POST /api/prescriptions/:id/upload` - Upload prescription document
- `GET /api/prescriptions/:id/files` - Get signed URLs for viewing
- `POST /api/uploads/signed-upload-url` - Get upload URL (with prescriptions bucket support)

### 4. **Security Features**
- **User-based isolation**: Files stored under user ID paths
- **Signed URLs**: Time-limited access (24 hours for viewing, 60 seconds for upload)
- **Access control**: Owner and admin-only access
- **File validation**: Type and size restrictions
- **Audit logging**: All file operations logged

### 5. **UI Components Updated**
- `PrescriptionUpload.tsx` - Direct upload to Supabase Storage
- `PrescriptionActionDialog.tsx` - Handles signed URLs for viewing
- `usePrescriptionFiles` hook - Manages file fetching with automatic refresh

## File Storage Structure

```
prescriptions/
├── {userId}/
│   └── {prescriptionId}/
│       └── {timestamp}.{ext}
```

## Configuration

### Environment Variables
```env
# S3-compatible storage (Supabase uses S3 API)
S3_ENDPOINT=https://[project-ref].supabase.co/storage/v1/s3
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your_access_key
S3_SECRET_ACCESS_KEY=your_secret_key

# Bucket name (optional, defaults to 'prescriptions')
NEXT_PUBLIC_PRESCRIPTIONS_BUCKET_NAME=prescriptions
```

### Config Update (`config/index.ts`)
```typescript
storage: {
  bucketNames: {
    // ... existing buckets
    prescriptions: process.env.NEXT_PUBLIC_PRESCRIPTIONS_BUCKET_NAME ?? "prescriptions",
  },
}
```

## Usage Examples

### Upload Prescription (Customer)
```typescript
// 1. Get signed upload URL
const { signedUrl } = await api.post('/uploads/signed-upload-url', null, {
  params: {
    bucket: 'prescriptions',
    path: `${userId}/${prescriptionId}/${timestamp}-${filename}`,
    contentType: file.type
  }
})

// 2. Upload file directly to Supabase
await fetch(signedUrl, {
  method: 'PUT',
  body: file,
  headers: { 'Content-Type': file.type }
})

// 3. Update prescription record
await api.post(`/prescriptions/${prescriptionId}/upload`, formData)
```

### View Prescription (Admin)
```typescript
// Get signed URLs for all prescription files
const { data } = await api.get(`/prescriptions/${prescriptionId}/files`)
const files = data.files // Array of { url, uploadedAt, key }

// URLs are pre-signed and ready to use
files.forEach(file => {
  // Display image or provide download link
  <img src={file.url} /> // or
  <a href={file.url} download>Download</a>
})
```

## Migration from Placeholder URLs

For existing prescriptions with placeholder URLs (`/uploads/...`):
1. Files with `documentKey` field use Supabase Storage
2. Files with only `imageUrl` field are legacy (backward compatible)
3. Migration utility available in `prescription-storage.ts`

## Security Considerations

### Access Control
- ✅ User can only upload to their own directory
- ✅ User can only view their own prescriptions
- ✅ Admin can view all prescriptions
- ✅ Only admin can delete prescription files

### File Validation
- ✅ MIME type validation (images and PDF only)
- ✅ File size limit (10MB)
- ✅ File extension validation
- ✅ Content-Type header validation

### URL Security
- ✅ Signed URLs expire after 24 hours
- ✅ Upload URLs expire after 60 seconds
- ✅ URLs cannot be guessed or enumerated
- ✅ Each request generates a new signed URL

## Performance Optimizations

1. **Caching**: Signed URLs cached for 1 hour in React Query
2. **Direct Upload**: Files uploaded directly to Supabase, bypassing API server
3. **Lazy Loading**: Files only fetched when needed
4. **Progressive Enhancement**: Fallback for legacy URLs

## Testing Checklist

### Upload Flow
- [x] Upload JPEG image < 10MB ✅
- [x] Upload PNG image < 10MB ✅
- [x] Upload PDF < 10MB ✅
- [x] Reject invalid file types ✅
- [x] Reject files > 10MB ✅

### Access Control
- [x] Customer can upload own prescription ✅
- [x] Customer can view own prescription ✅
- [x] Customer cannot view others' prescriptions ✅
- [x] Admin can view all prescriptions ✅
- [x] Non-authenticated users blocked ✅

### Storage Integration
- [x] Files stored in correct bucket ✅
- [x] Files organized by user ID ✅
- [x] Signed URLs generated correctly ✅
- [x] URLs expire as configured ✅

## Monitoring & Debugging

### Check Storage Bucket
```sql
-- View bucket configuration
SELECT * FROM storage.buckets WHERE id = 'prescriptions';

-- View stored files
SELECT * FROM storage.objects WHERE bucket_id = 'prescriptions';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'objects';
```

### Debug Upload Issues
1. Check browser console for upload errors
2. Verify signed URL generation in Network tab
3. Check Supabase Storage logs
4. Verify file size and type

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Access denied" error | Check user authentication and RLS policies |
| Upload fails silently | Verify CORS settings in Supabase dashboard |
| Signed URL expired | Increase `expiresIn` parameter or refresh URL |
| File not displaying | Check Content-Type header and file permissions |

## Future Enhancements

1. **OCR Integration**: Extract text from prescription images
2. **Thumbnail Generation**: Create previews for faster loading
3. **Virus Scanning**: Scan uploaded files for malware
4. **Compression**: Optimize images before storage
5. **Multi-file Upload**: Support multiple prescription pages
6. **Version Control**: Track prescription document versions
7. **Backup Strategy**: Automated backups to secondary storage

## Conclusion

The prescription file storage system is now fully integrated with Supabase Storage, providing:
- ✅ Secure file storage with RLS
- ✅ Signed URLs for controlled access
- ✅ Direct uploads for better performance
- ✅ Audit logging for compliance
- ✅ Backward compatibility with existing data

The implementation follows the established patterns in the codebase and leverages Supabase's built-in security features for a robust and scalable solution.
