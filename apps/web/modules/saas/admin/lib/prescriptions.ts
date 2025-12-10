import { apiClient } from '@shared/lib/api-client';

export type PrescriptionStatus =
  | 'PENDING_VERIFICATION'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CLARIFICATION';

export interface AdminPrescription {
  id: string;
  orderId: string;
  customerId: string;
  fileUrl: string;
  fileName: string;
  status: PrescriptionStatus;
  notes?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: { orderNumber: string };
  customer?: { user?: { name?: string | null; email?: string | null } };
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedPrescriptions {
  prescriptions: AdminPrescription[];
  pagination: Pagination;
}

export async function fetchAdminPrescriptions(params: {
  page?: number;
  limit?: number;
  status?: PrescriptionStatus;
  search?: string;
  hasFile?: boolean;
  startDate?: string; // ISO date
  endDate?: string;   // ISO date
}): Promise<PaginatedPrescriptions> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));

  // Map UI status to API status (Prisma enum)
  const statusMap: Record<PrescriptionStatus, string> = {
    PENDING_VERIFICATION: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    NEEDS_CLARIFICATION: 'CLARIFICATION',
  };
  if (params.status) query.set('status', statusMap[params.status]);
  if (params.search) query.set('search', params.search);
  if (typeof params.hasFile === 'boolean') query.set('hasFile', String(params.hasFile));
  if (params.startDate) query.set('startDate', params.startDate);
  if (params.endDate) query.set('endDate', params.endDate);

  // Use public API route for prescriptions
  const res = await fetch(`/api/prescriptions?${query.toString()}`, {
    method: 'GET',
    credentials: 'include',
  });
  if (!res.ok) {
    throw new Error('Failed to fetch prescriptions');
  }
  const json = await res.json();

  // Map API response to AdminPrescription[] shape expected by UI
  const mapped: AdminPrescription[] = (json?.data?.prescriptions || []).map((p: any) => ({
    id: p.id,
    orderId: p.orderId,
    customerId: p?.customer?.id || p?.order?.customerId,
    fileUrl: p.fileUrl || p.imageUrl || '',
    fileName: p.fileName || '',
    status: ((): PrescriptionStatus => {
      switch (p.status) {
        case 'APPROVED':
          return 'APPROVED';
        case 'REJECTED':
          return 'REJECTED';
        case 'CLARIFICATION':
          return 'NEEDS_CLARIFICATION';
        default:
          return 'PENDING_VERIFICATION';
      }
    })(),
    notes: p.notes,
    rejectionReason: p.rejectionReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    order: { orderNumber: p.order?.orderNumber },
    customer: { user: { name: p.customer?.contactName, email: p.customer?.email } },
  }));

  const pagination: Pagination = {
    page: Number(json?.data?.pagination?.page || 1),
    limit: Number(json?.data?.pagination?.limit || 10),
    total: Number(json?.data?.pagination?.total || 0),
    pages: Number(json?.data?.pagination?.totalPages || 1),
  };

  return { prescriptions: mapped, pagination };
}

export async function updatePrescriptionStatus(
  id: string,
  payload: { status: PrescriptionStatus; rejectionReason?: string; notes?: string }
): Promise<AdminPrescription> {
  console.log('updatePrescriptionStatus called with:', { id, payload });
  
  // Get CSRF token
  try {
    const tokenResp = await fetch('/api/prescriptions/csrf', { 
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
      }
    });
    console.log('CSRF token response status:', tokenResp.status);
    
    let csrfToken = '';
    
    if (tokenResp.ok) {
      const tokenData = await tokenResp.json();
      csrfToken = tokenData.csrfToken || tokenResp.headers.get('X-CSRF-Token') || '';
      console.log('CSRF token obtained:', csrfToken ? 'Yes' : 'No');
    } else {
      console.warn('Failed to get CSRF token, continuing without it');
    }
    
    if (!csrfToken) {
      console.warn('No CSRF token available, request might fail');
    }

    // Map UI status to API status
    const statusMap: Record<PrescriptionStatus, string> = {
      PENDING_VERIFICATION: 'PENDING',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      NEEDS_CLARIFICATION: 'CLARIFICATION',
    };

    const body: any = {
      status: statusMap[payload.status],
    };
    
    // Only add notes if it's defined and not empty
    if (payload.notes) {
      body.notes = payload.notes;
    }
    if (payload.status === 'REJECTED') {
      body.rejectionReason = payload.rejectionReason;
    }
    if (payload.status === 'NEEDS_CLARIFICATION') {
      body.clarificationRequest = payload.rejectionReason || payload.notes || 'Clarification requested';
    }

    console.log('Sending PATCH request to:', `/api/prescriptions/${id}`);
    console.log('Request body:', body);
    console.log('CSRF token:', csrfToken);
    
    const res = await fetch(`/api/prescriptions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        // 'X-CSRF-Token': csrfToken, // Temporarily disabled
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });

    console.log('PATCH response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('Failed to update prescription:', res.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Error details:', errorJson);
        if (errorJson.error?.details) {
          console.error('Validation errors:', errorJson.error.details);
        }
      } catch (e) {
        // If it's not JSON, just log the text
      }
      throw new Error(`Failed to update prescription: ${res.status} - ${errorText}`);
    }

    const json = await res.json();
    return json?.data?.prescription as AdminPrescription;
  } catch (error) {
    console.error('Error in updatePrescriptionStatus:', error);
    throw error;
  }
}
