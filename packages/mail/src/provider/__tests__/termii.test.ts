import { TermiiProvider } from '../termii';
import type { NotificationJobData } from '@repo/queue';

// Mock fetch globally
const mockFetch = global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('TermiiProvider', () => {
	let provider: TermiiProvider;
	
	beforeEach(() => {
		provider = new TermiiProvider({
			apiKey: 'test-api-key',
			senderId: 'BenPharm'
		});
		mockFetch.mockClear();
	});

	describe('constructor', () => {
		it('should create provider with valid config', () => {
			expect(provider.name).toBe('Termii');
			expect(provider.channel).toBe('sms');
		});

		it('should throw error if API key is missing', () => {
			expect(() => new TermiiProvider({ apiKey: '' })).toThrow('Termii API key is required');
		});

		it('should throw error if sender ID is too long', () => {
			expect(() => new TermiiProvider({ 
				apiKey: 'test', 
				senderId: 'VeryLongSenderID' 
			})).toThrow('Termii sender ID must be 11 characters or less');
		});
	});

	describe('Nigerian phone number validation', () => {
		const testCases = [
			// Valid formats
			{ input: '+2348012345678', expected: '+2348012345678' },
			{ input: '2348012345678', expected: '+2348012345678' },
			{ input: '08012345678', expected: '+2348012345678' },
			{ input: '8012345678', expected: '+2348012345678' },
			// With spaces and formatting
			{ input: '+234 801 234 5678', expected: '+2348012345678' },
			{ input: '0801 234 5678', expected: '+2348012345678' },
		];

		testCases.forEach(({ input, expected }) => {
			it(`should normalize ${input} to ${expected}`, () => {
				const normalized = (provider as any).normalizeNigerianPhone(input);
				expect(normalized).toBe(expected);
			});
		});

		const invalidCases = [
			'1234567890', // Not Nigerian
			'+1234567890', // Wrong country code
			'+23470123456', // Wrong network prefix
			'08012345', // Too short
		];

		invalidCases.forEach((input) => {
			it(`should throw error for invalid number: ${input}`, () => {
				expect(() => (provider as any).normalizeNigerianPhone(input))
					.toThrow('Invalid Nigerian phone number');
			});
		});
	});

	describe('sendMessage', () => {
		const mockJobData: NotificationJobData = {
			notificationId: 'test-notification-id',
			type: 'order_confirmation',
			channel: 'sms',
			recipient: '+2348012345678',
			message: 'Test message',
		};

		it('should send SMS successfully', async () => {
			const mockResponse = {
				message_id: 'termii-msg-123',
				balance: 100,
				user: 'test-user',
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await (provider as any).sendMessage(mockJobData);

			expect(result.success).toBe(true);
			expect(result.providerMessageId).toBe('termii-msg-123');
			expect(result.providerResponse).toEqual(mockResponse);

			// Verify API call
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.ng.termii.com/api/sms/send',
				expect.objectContaining({
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						api_key: 'test-api-key',
						to: '2348012345678', // No + prefix for Termii
						from: 'BenPharm',
						sms: 'Test message',
						type: 'plain',
						channel: 'dnd',
					}),
				})
			);
		});

		it('should handle template-based messages', async () => {
			const templateData: NotificationJobData = {
				notificationId: 'test-notification-id',
				type: 'order_confirmation',
				channel: 'sms',
				recipient: '+2348012345678',
				template: 'order_confirmation_sms',
				templateParams: {
					order_number: 'ORD123',
					total_amount: 5000,
					tracking_url: 'https://example.com/track/ORD123',
				},
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message_id: 'msg-123' }),
			} as Response);

			const result = await (provider as any).sendMessage(templateData);

			expect(result.success).toBe(true);

			// Check that template was processed (message should contain order details)
			const sentPayload = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
			expect(sentPayload.sms).toContain('ORD123');
			expect(sentPayload.sms).toContain('5000');
		});

		it('should handle API errors', async () => {
			const errorResponse = {
				message: 'Invalid phone number',
				code: '422',
			};

			mockFetch.mockResolvedValueOnce({
				ok: false,
				json: async () => errorResponse,
			} as Response);

			const result = await (provider as any).sendMessage(mockJobData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Invalid phone number');
			expect(result.retryable).toBe(false); // Invalid phone number is not retryable
		});

		it('should handle network errors', async () => {
			mockFetch.mockRejectedValueOnce(new Error('Network error'));

			const result = await (provider as any).sendMessage(mockJobData);

			expect(result.success).toBe(false);
			expect(result.error).toBe('Network error');
			expect(result.retryable).toBe(true); // Network errors are retryable
		});

		it('should validate message length', async () => {
			const longMessage = 'A'.repeat(700); // Exceeds 612 character limit

			const longMessageData: NotificationJobData = {
				...mockJobData,
				message: longMessage,
			};

			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ message_id: 'msg-123' }),
			} as Response);

			// Should still send but warn about length
			const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
			
			const result = await (provider as any).sendMessage(longMessageData);

			expect(result.success).toBe(true);
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Message length 700 exceeds recommended limit')
			);

			consoleSpy.mockRestore();
		});
	});

	describe('testConnection', () => {
		it('should return true for successful connection test', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					balance: 100,
					currency: 'NGN',
				}),
			} as Response);

			const result = await provider.testConnection();

			expect(result).toBe(true);
			expect(mockFetch).toHaveBeenCalledWith(
				'https://api.ng.termii.com/api/get-balance?api_key=test-api-key',
				expect.objectContaining({
					method: 'GET',
					headers: { 'Content-Type': 'application/json' },
				})
			);
		});

		it('should return false for failed connection test', async () => {
			mockFetch.mockResolvedValueOnce({
				ok: false,
				text: async () => 'Unauthorized',
			} as Response);

			const result = await provider.testConnection();

			expect(result).toBe(false);
		});
	});

	describe('error handling', () => {
		it('should correctly identify retryable errors', () => {
			const retryableErrors = [
				{ code: '429' }, // Rate limit
				{ code: '500' }, // Server error
				{ message: 'rate limit exceeded' },
			];

			retryableErrors.forEach((error) => {
				const result = (provider as any).isTermiiErrorRetryable(error);
				expect(result).toBe(true);
			});
		});

		it('should correctly identify non-retryable errors', () => {
			const nonRetryableErrors = [
				{ message: 'Invalid API key' },
				{ message: 'Invalid phone number' },
				{ message: 'Insufficient balance' },
			];

			nonRetryableErrors.forEach((error) => {
				const result = (provider as any).isTermiiErrorRetryable(error);
				expect(result).toBe(false);
			});
		});
	});

	describe('fromEnvironment factory', () => {
		const originalEnv = process.env;

		beforeEach(() => {
			jest.resetModules();
			process.env = { ...originalEnv };
		});

		afterEach(() => {
			process.env = originalEnv;
		});

		it('should create provider from environment variables', () => {
			process.env.TERMII_API_KEY = 'env-api-key';
			process.env.TERMII_SENDER_ID = 'EnvSender';

			const provider = TermiiProvider.fromEnvironment();

			expect(provider.name).toBe('Termii');
			expect((provider as any).apiKey).toBe('env-api-key');
			expect((provider as any).senderId).toBe('EnvSender');
		});

		it('should use fallback environment variable names', () => {
			process.env.SMS_API_KEY = 'fallback-api-key';
			process.env.SMS_SENDER_ID = 'Fallback';

			const provider = TermiiProvider.fromEnvironment();

			expect((provider as any).apiKey).toBe('fallback-api-key');
			expect((provider as any).senderId).toBe('Fallback');
		});

		it('should use default sender ID if not provided', () => {
			process.env.TERMII_API_KEY = 'api-key';

			const provider = TermiiProvider.fromEnvironment();

			expect((provider as any).senderId).toBe('BenPharm');
		});

		it('should throw error if no API key in environment', () => {
			delete process.env.TERMII_API_KEY;
			delete process.env.SMS_API_KEY;

			expect(() => TermiiProvider.fromEnvironment()).toThrow(
				'TERMII_API_KEY or SMS_API_KEY environment variable is required'
			);
		});
	});
});
