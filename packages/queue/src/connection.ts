import { Redis } from 'ioredis';

let redisConnection: Redis | null = null;

export function createRedisConnection(): Redis {
	if (redisConnection) {
		return redisConnection;
	}

	const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
	
	if (!redisUrl) {
		throw new Error(
			'REDIS_URL or REDIS_CONNECTION_STRING environment variable is required'
		);
	}

	redisConnection = new Redis(redisUrl, {
		// Connection options
		connectTimeout: 10000,
		lazyConnect: false, // Connect immediately
		
		// Health check options
		enableOfflineQueue: true, // Allow queuing commands while connecting
		maxRetriesPerRequest: null, // Set to null to avoid deprecation warning
	});

	// Connection event handlers
	redisConnection.on('connect', () => {
		console.log('✅ Redis connected successfully');
	});

	redisConnection.on('error', (error) => {
		console.error('❌ Redis connection error:', error);
	});

	redisConnection.on('close', () => {
		console.log('🔌 Redis connection closed');
	});

	return redisConnection;
}

export function getRedisConnection(): Redis {
	if (!redisConnection) {
		return createRedisConnection();
	}
	return redisConnection;
}

export async function closeRedisConnection(): Promise<void> {
	if (redisConnection) {
		await redisConnection.quit();
		redisConnection = null;
	}
}
