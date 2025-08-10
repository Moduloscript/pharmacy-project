/**
 * Payment Orchestrator for Nigerian Payment Gateways
 * Handles fallback logic between Flutterwave, OPay, and Paystack
 */

import type { 
  NigerianPaymentProvider, 
  NigerianOrder, 
  PaymentOrchestrationResult,
  PaymentInitResponse,
  GatewayHealthResponse 
} from '../../types';
import { NigerianPaymentError, NIGERIAN_PAYMENT_ERRORS } from '../../types';
import { detectSlowConnection, getNigerianErrorMessage } from './nigerian-utils';

interface PaymentOrchestrationConfig {
  maxRetries: number;
  timeoutMs: number;
  healthCheckInterval: number; // milliseconds
  enableFallback: boolean;
}

interface GatewayAttempt {
  gateway: string;
  success: boolean;
  error?: string;
  timestamp: Date;
  responseTimeMs: number;
}

export class PaymentOrchestrator {
  private providers: Map<string, NigerianPaymentProvider> = new Map();
  private gatewayHealth: Map<string, GatewayHealthResponse> = new Map();
  private config: PaymentOrchestrationConfig;
  
  // Priority order: Flutterwave (primary) -> OPay (secondary) -> Paystack (tertiary)
  private readonly GATEWAY_PRIORITY = ['FLUTTERWAVE', 'OPAY', 'PAYSTACK'] as const;

  constructor(config: Partial<PaymentOrchestrationConfig> = {}) {
    this.config = {
      maxRetries: 2,
      timeoutMs: 30000, // 30 seconds
      healthCheckInterval: 5 * 60 * 1000, // 5 minutes
      enableFallback: true,
      ...config,
    };
    
    // Start health check interval
    this.startHealthCheckInterval();
  }

  /**
   * Register a payment provider
   */
  registerProvider(provider: NigerianPaymentProvider): void {
    const gatewayName = provider.getGatewayName();
    this.providers.set(gatewayName, provider);
    
    // Initialize health status
    this.gatewayHealth.set(gatewayName, {
      isHealthy: true,
      responseTime: 0,
      lastChecked: new Date(),
    });
  }

  /**
   * Process payment with automatic fallback
   */
  async processPayment(order: NigerianOrder): Promise<PaymentOrchestrationResult> {
    const attempts: GatewayAttempt[] = [];
    let finalResult: PaymentInitResponse | undefined;
    
    // Check for slow connection first
    const isSlowConnection = await detectSlowConnection();
    if (isSlowConnection) {
      console.warn('Slow connection detected, adjusting timeout');
    }

    // Get available gateways sorted by health and priority
    const availableGateways = this.getAvailableGateways();
    
    if (availableGateways.length === 0) {
      throw new NigerianPaymentError(
        'All payment gateways are currently unavailable',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN
      );
    }

    // Try each gateway in priority order
    for (const gatewayName of availableGateways) {
      const provider = this.providers.get(gatewayName);
      if (!provider) continue;

      const startTime = Date.now();
      
      try {
        console.log(`Attempting payment with ${gatewayName}`);
        
        // Add timeout to prevent hanging
        const paymentPromise = provider.initializePayment(order);
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Gateway timeout')), this.config.timeoutMs);
        });
        
        const result = await Promise.race([paymentPromise, timeoutPromise]);
        const responseTime = Date.now() - startTime;
        
        attempts.push({
          gateway: gatewayName,
          success: true,
          timestamp: new Date(),
          responseTimeMs: responseTime,
        });
        
        // Update health status with successful response time
        this.updateGatewayHealth(gatewayName, responseTime, true);
        
        finalResult = result;
        
        return {
          success: true,
          gateway: gatewayName as 'FLUTTERWAVE' | 'OPAY' | 'PAYSTACK',
          attempts,
          finalResult,
        };
        
      } catch (error) {
        const responseTime = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.error(`Payment failed with ${gatewayName}:`, errorMessage);
        
        attempts.push({
          gateway: gatewayName,
          success: false,
          error: errorMessage,
          timestamp: new Date(),
          responseTimeMs: responseTime,
        });
        
        // Update health status
        this.updateGatewayHealth(gatewayName, responseTime, false);
        
        // If this is the last gateway or fallback is disabled, throw error
        if (!this.config.enableFallback || gatewayName === availableGateways[availableGateways.length - 1]) {
          throw new NigerianPaymentError(
            `All payment attempts failed. Last error: ${errorMessage}`,
            NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN,
            gatewayName,
            error
          );
        }
        
        // Continue to next gateway
        continue;
      }
    }
    
    // This shouldn't happen, but handle it gracefully
    throw new NigerianPaymentError(
      'Payment processing failed unexpectedly',
      NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN
    );
  }

  /**
   * Verify payment across all possible gateways
   */
  async verifyPayment(reference: string): Promise<any> {
    const errors: string[] = [];
    
    // Try to verify with all available gateways
    for (const [gatewayName, provider] of this.providers.entries()) {
      try {
        const result = await provider.verifyPayment(reference);
        if (result.success) {
          return result;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${gatewayName}: ${errorMessage}`);
      }
    }
    
    throw new NigerianPaymentError(
      `Payment verification failed across all gateways: ${errors.join(', ')}`,
      NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN
    );
  }

  /**
   * Get the best available gateway based on health and priority
   */
  getBestAvailableGateway(): string | null {
    const available = this.getAvailableGateways();
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Get available gateways sorted by health and priority
   */
  private getAvailableGateways(): string[] {
    return this.GATEWAY_PRIORITY.filter(gateway => {
      const health = this.gatewayHealth.get(gateway);
      const provider = this.providers.get(gateway);
      
      return provider && health && health.isHealthy;
    });
  }

  /**
   * Update gateway health status
   */
  private updateGatewayHealth(
    gatewayName: string, 
    responseTime: number, 
    success: boolean
  ): void {
    const currentHealth = this.gatewayHealth.get(gatewayName);
    if (!currentHealth) return;

    this.gatewayHealth.set(gatewayName, {
      isHealthy: success && responseTime < 10000, // Consider unhealthy if >10s response
      responseTime,
      lastChecked: new Date(),
      error: success ? undefined : 'Gateway error detected',
    });
  }

  /**
   * Perform health check on all registered gateways
   */
  async performHealthCheck(): Promise<Map<string, GatewayHealthResponse>> {
    const healthPromises = Array.from(this.providers.entries()).map(
      async ([gatewayName, provider]) => {
        try {
          const health = await provider.checkGatewayHealth();
          this.gatewayHealth.set(gatewayName, health);
          return [gatewayName, health] as const;
        } catch (error) {
          const errorHealth: GatewayHealthResponse = {
            isHealthy: false,
            responseTime: 0,
            lastChecked: new Date(),
            error: error instanceof Error ? error.message : 'Health check failed',
          };
          this.gatewayHealth.set(gatewayName, errorHealth);
          return [gatewayName, errorHealth] as const;
        }
      }
    );

    const results = await Promise.all(healthPromises);
    return new Map(results);
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheckInterval(): void {
    setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('Health check failed:', error);
      });
    }, this.config.healthCheckInterval);
  }

  /**
   * Get current gateway health status
   */
  getGatewayHealth(): Map<string, GatewayHealthResponse> {
    return new Map(this.gatewayHealth);
  }

  /**
   * Force refresh gateway health
   */
  async refreshGatewayHealth(): Promise<void> {
    await this.performHealthCheck();
  }

  /**
   * Get gateway statistics for monitoring
   */
  getGatewayStats(): Array<{
    gateway: string;
    isHealthy: boolean;
    responseTime: number;
    lastChecked: Date;
    supportedMethods: string[];
  }> {
    return Array.from(this.providers.entries()).map(([gatewayName, provider]) => {
      const health = this.gatewayHealth.get(gatewayName);
      return {
        gateway: gatewayName,
        isHealthy: health?.isHealthy ?? false,
        responseTime: health?.responseTime ?? 0,
        lastChecked: health?.lastChecked ?? new Date(0),
        supportedMethods: provider.getSupportedPaymentMethods(),
      };
    });
  }

  /**
   * Handle webhook from any gateway
   */
  async handleWebhook(payload: any, signature?: string, gatewayHint?: string): Promise<any> {
    // If gateway is specified, try that first
    if (gatewayHint && this.providers.has(gatewayHint)) {
      try {
        const provider = this.providers.get(gatewayHint)!;
        return await provider.handleWebhook(payload, signature);
      } catch (error) {
        console.error(`Webhook failed for specified gateway ${gatewayHint}:`, error);
      }
    }

    // Try all gateways
    const errors: string[] = [];
    for (const [gatewayName, provider] of this.providers.entries()) {
      try {
        const result = await provider.handleWebhook(payload, signature);
        if (result.success && result.processed) {
          return result;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${gatewayName}: ${errorMessage}`);
      }
    }

    throw new NigerianPaymentError(
      `Webhook processing failed: ${errors.join(', ')}`,
      NIGERIAN_PAYMENT_ERRORS.WEBHOOK_VERIFICATION_FAILED
    );
  }

  /**
   * Get recommended gateway for user based on location or preferences
   */
  getRecommendedGateway(userLocation?: { state: string; city: string }): string {
    const available = this.getAvailableGateways();
    
    if (available.length === 0) {
      throw new NigerianPaymentError(
        'No payment gateways available',
        NIGERIAN_PAYMENT_ERRORS.GATEWAY_DOWN
      );
    }

    // For Nigerian users, prefer Flutterwave, then OPay, then Paystack
    // Could be enhanced with regional preferences based on userLocation
    return available[0];
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear any intervals or timers
    // This method should be called when shutting down the orchestrator
    this.providers.clear();
    this.gatewayHealth.clear();
  }
}

// Singleton instance for easy use across the application
let orchestratorInstance: PaymentOrchestrator | null = null;

export function getPaymentOrchestrator(config?: Partial<PaymentOrchestrationConfig>): PaymentOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new PaymentOrchestrator(config);
  }
  return orchestratorInstance;
}

export function resetPaymentOrchestrator(): void {
  if (orchestratorInstance) {
    orchestratorInstance.destroy();
    orchestratorInstance = null;
  }
}
