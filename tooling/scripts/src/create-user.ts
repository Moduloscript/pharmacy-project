import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { nanoid } from "nanoid";

async function main() {
	logger.info("Creating admin user for BenPharm Online!");

	// Get admin credentials from environment variables
	const email = process.env.ADMIN_EMAIL;
	const adminPassword = process.env.ADMIN_PASSWORD;
	const name = process.env.ADMIN_NAME || "BenPharm Admin";

	if (!email || !adminPassword) {
		logger.error("ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required!");
		logger.info("Please set these in your .env file:");
		logger.info("ADMIN_EMAIL=your-admin@email.com");
		logger.info("ADMIN_PASSWORD=your-secure-password");
		return;
	}

	const isAdmin = true;

	const authContext = await auth.$context;
	const hashedPassword = await authContext.password.hash(adminPassword);

	// check if user exists
	const user = await db.user.findUnique({
		where: {
			email,
		},
	});

	if (user) {
		logger.error("User with this email already exists!");
		return;
	}

	const adminUser = await db.user.create({
		data: {
			id: nanoid(),
			email,
			name,
			role: isAdmin ? "admin" : "user",
			emailVerified: true,
			createdAt: new Date(),
			updatedAt: new Date(),
			onboardingComplete: true,
		},
		include: {
			accounts: true,
		},
	});

	if (
		!adminUser?.accounts.some(
			(account) => account.providerId === "credential",
		)
	) {
		await db.account.create({
			data: {
				id: nanoid(),
				userId: adminUser.id,
				accountId: adminUser.id,
				providerId: "credential",
				createdAt: new Date(),
				updatedAt: new Date(),
				password: hashedPassword,
			},
		});
	}

	logger.info("User created successfully!");
	logger.info(`Admin user created with email: ${email}`);
	logger.info("Please keep your credentials secure!");
}

main().catch((error) => {
	logger.error("Error:", error);
});
