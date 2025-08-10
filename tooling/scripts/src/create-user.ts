import { auth } from "@repo/auth";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { nanoid } from "nanoid";

async function main() {
	logger.info("Creating admin user for BenPharm Online!");

	// Set specific admin credentials
	const email = "maduemeka254@gmail.com";
	const name = "BenPharm Admin";
	const isAdmin = true;

	const authContext = await auth.$context;
	const adminPassword = "Rufex200$";
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

	logger.success("User created successfully!");
	logger.info(`Here is the password for the new user: ${adminPassword}`);
}

main();
