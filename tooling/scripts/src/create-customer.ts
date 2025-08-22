import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { nanoid } from "nanoid";

async function main() {
	logger.info("Checking for existing customers in BenPharm Online!");

	// First, let's check existing users
	const users = await db.user.findMany({
		select: {
			id: true,
			email: true,
			name: true,
			customer: true
		}
	});

	logger.info(`Found ${users.length} users in the database`);

	// Check existing customers
	const customers = await db.customer.findMany({
		include: {
			user: {
				select: {
					id: true,
					email: true,
					name: true
				}
			}
		}
	});

	logger.info(`Found ${customers.length} customers in the database`);

	if (customers.length > 0) {
		logger.info("Existing customers:");
		customers.forEach(customer => {
			logger.info(`- Customer ID: ${customer.id.substring(0, 8)}..., Type: ${customer.customerType}, User: ${customer.user.email}`);
		});
	}

	// Find users without customer profiles
	const usersWithoutCustomers = users.filter(user => !user.customer);
	
	if (usersWithoutCustomers.length === 0) {
		logger.info("All users already have customer profiles!");
		return;
	}

	logger.info(`Found ${usersWithoutCustomers.length} users without customer profiles:`);
	usersWithoutCustomers.forEach(user => {
		logger.info(`- ${user.email} (${user.name})`);
	});

	// Create a customer profile for the first user without one
	const userToCreateCustomer = usersWithoutCustomers[0];
	
	logger.info(`Creating customer profile for: ${userToCreateCustomer.email}`);

	const newCustomer = await db.customer.create({
		data: {
			id: nanoid(),
			userId: userToCreateCustomer.id,
			customerType: "RETAIL", // Default to RETAIL
			phone: "08012345678", // Placeholder valid Nigerian phone
			address: "Lagos, Nigeria", // Placeholder address
			city: "Lagos",
			state: "Lagos",
			lga: "Ikeja",
			country: "Nigeria",
			businessName: null, // RETAIL customers don't need business info
			verificationStatus: "PENDING",
			createdAt: new Date(),
			updatedAt: new Date(),
		},
		include: {
			user: {
				select: {
					email: true,
					name: true
				}
			}
		}
	});

	logger.info("Customer profile created successfully!");
	logger.info(`Customer ID: ${newCustomer.id.substring(0, 8)}...`); // Only show first 8 chars
	logger.info(`User: ${newCustomer.user.email} (${newCustomer.user.name})`);
	logger.info(`Type: ${newCustomer.customerType}`);
	logger.info(`Location: ${newCustomer.city}, ${newCustomer.state}`);
}

main().catch((error) => {
	logger.error("Error:", error);
});
