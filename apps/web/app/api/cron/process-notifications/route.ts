import { createNotificationWorker, registerNotificationProvider } from '@repo/queue';
import { TermiiProvider, ResendEmailProvider } from '@repo/mail';

// Vercel serverless function timeout
export const maxDuration = 60; // 60 seconds

export async function GET(request: Request) {
	try {
		// Verify this is from Vercel Cron (optional but recommended)
		const authHeader = request.headers.get('authorization');
		const cronSecret = process.env.CRON_SECRET;
		
		if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
			console.error('Unauthorized cron request');
			return new Response('Unauthorized', { status: 401 });
		}

		console.log('🔄 Starting notification worker cron job...');

		// Register Email Provider
		if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
			const emailProvider = new ResendEmailProvider();
			registerNotificationProvider(emailProvider);
			console.log('✅ Registered email provider');
		} else {
			console.warn('⚠️ Email provider not configured');
		}

		// Register SMS Provider
		if (process.env.SMS_API_KEY && process.env.SMS_SENDER_ID) {
			const smsProvider = new TermiiProvider({
				apiKey: process.env.SMS_API_KEY,
				senderId: process.env.SMS_SENDER_ID,
			});
			registerNotificationProvider(smsProvider);
			console.log('✅ Registered SMS provider');
		} else {
			console.warn('⚠️ SMS provider not configured');
		}

		// Create worker with short-lived configuration
		const worker = createNotificationWorker({
			concurrency: 10, // Process up to 10 jobs concurrently
		});

		console.log('✅ Worker created, processing jobs...');

		// Process jobs for 50 seconds (leave 10s buffer for cleanup)
		await new Promise((resolve) => setTimeout(resolve, 50000));

		// Close worker gracefully
		await worker.close();
		
		console.log('✅ Cron job completed successfully');

		return Response.json({
			success: true,
			message: 'Notification worker processed jobs',
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		console.error('❌ Cron job error:', error);
		return Response.json(
			{
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			{ status: 500 }
		);
	}
}
