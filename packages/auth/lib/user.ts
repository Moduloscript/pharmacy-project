import { db } from "@repo/database";
import { CustomerType, BusinessVerificationStatus } from "@repo/database";

export async function getUserByEmail(email: string) {
	const user = await db.user.findUnique({
		where: {
			email,
		},
		include: {
			customer: true,
		},
	});

	return user;
}

export async function getUserById(id: string) {
	const user = await db.user.findUnique({
		where: {
			id,
		},
		include: {
			customer: true,
		},
	});

	return user;
}

interface CreateCustomerProfileData {
	userId: string;
	customerType: CustomerType;
	phone: string;
	// Personal address (for retail customers)
	address?: string;
	city?: string;
	state?: string;
	lga?: string;
	// Business information (for business customers)
	businessName?: string;
	businessAddress?: string;
	businessPhone?: string;
	businessEmail?: string;
	pharmacyLicense?: string;
	taxId?: string;
	establishedYear?: number;
	description?: string;
	// Verification documents (URLs)
	verificationDocuments?: string[];
}

export async function createCustomerProfile(data: CreateCustomerProfileData) {
	try {
		const customer = await db.customer.create({
			data: {
				userId: data.userId,
				customerType: data.customerType,
				phone: data.phone,
				// Address fields
				address: data.address,
				city: data.city,
				state: data.state,
				lga: data.lga,
				// Business fields (only for business customers)
				businessName: data.businessName,
				businessAddress: data.businessAddress,
				businessPhone: data.businessPhone,
				businessEmail: data.businessEmail,
				pharmacyLicense: data.pharmacyLicense,
				taxId: data.taxId,
				// Verification status - business customers need verification
				verificationStatus: data.customerType === 'RETAIL' 
					? BusinessVerificationStatus.VERIFIED 
					: BusinessVerificationStatus.PENDING,
				verificationDocuments: data.verificationDocuments 
					? JSON.stringify(data.verificationDocuments) 
					: null,
				// Set default credit terms for wholesale customers
				creditLimit: data.customerType === 'WHOLESALE' ? 50000 : null, // ₦50,000 default
				creditTermDays: data.customerType === 'WHOLESALE' ? 30 : null, // 30 days
			},
		});

		return { customer, error: null };
	} catch (error) {
		console.error('Error creating customer profile:', error);
		return { customer: null, error: 'Failed to create customer profile' };
	}
}

export async function upsertCustomerProfile(data: CreateCustomerProfileData) {
	try {
		const customer = await db.customer.upsert({
			where: { userId: data.userId },
			create: {
				userId: data.userId,
				customerType: data.customerType,
				phone: data.phone,
				address: data.address,
				city: data.city,
				state: data.state,
				lga: data.lga,
				businessName: data.businessName,
				businessAddress: data.businessAddress,
				businessPhone: data.businessPhone,
				businessEmail: data.businessEmail,
				pharmacyLicense: data.pharmacyLicense,
				taxId: data.taxId,
				verificationStatus: data.customerType === 'RETAIL' 
					? BusinessVerificationStatus.VERIFIED 
					: BusinessVerificationStatus.PENDING,
				verificationDocuments: data.verificationDocuments 
					? JSON.stringify(data.verificationDocuments) 
					: null,
				creditLimit: data.customerType === 'WHOLESALE' ? 50000 : null,
				creditTermDays: data.customerType === 'WHOLESALE' ? 30 : null,
			},
			update: {
				customerType: data.customerType,
				phone: data.phone,
				address: data.address,
				city: data.city,
				state: data.state,
				lga: data.lga,
				businessName: data.businessName,
				businessAddress: data.businessAddress,
				businessPhone: data.businessPhone,
				businessEmail: data.businessEmail,
				pharmacyLicense: data.pharmacyLicense,
				taxId: data.taxId,
				// Rerun verification logic on update if type changes or docs change
				verificationStatus: data.customerType === 'RETAIL' 
					? BusinessVerificationStatus.VERIFIED 
					: BusinessVerificationStatus.PENDING,
				verificationDocuments: data.verificationDocuments 
					? JSON.stringify(data.verificationDocuments) 
					: null,
			},
		});

		return { customer, error: null };
	} catch (error) {
		console.error('Error upserting customer profile:', error);
		return { customer: null, error: 'Failed to create or update customer profile' };
	}
}

export async function updateCustomerVerificationStatus(
	customerId: string, 
	status: BusinessVerificationStatus,
	creditLimit?: number
) {
	try {
		const customer = await db.customer.update({
			where: { id: customerId },
			data: {
				verificationStatus: status,
				...(creditLimit && { creditLimit })
			},
		});

		return { customer, error: null };
	} catch (error) {
		console.error('Error updating customer verification:', error);
		return { customer: null, error: 'Failed to update verification status' };
	}
}

export async function getCustomersByVerificationStatus(
	status: BusinessVerificationStatus
) {
	try {
		const customers = await db.customer.findMany({
			where: {
				verificationStatus: status,
				customerType: {
					in: ['WHOLESALE', 'PHARMACY', 'CLINIC'] as CustomerType[]
				}
			},
			include: {
				user: {
					select: {
						name: true,
						email: true,
						createdAt: true
					}
				}
			},
			orderBy: {
				createdAt: 'desc'
			}
		});

		return customers;
	} catch (error) {
		console.error('Error fetching customers by verification status:', error);
		return [];
	}
}

// Helper function to check if user needs to complete customer profile
export async function userNeedsCustomerProfile(userId: string): Promise<boolean> {
	try {
		const customer = await db.customer.findUnique({
			where: { userId }
		});
		return !customer;
	} catch (error) {
		console.error('Error checking customer profile:', error);
		return true;
	}
}
