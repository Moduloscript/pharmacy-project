import { db } from '@repo/database';

/**
 * Notification Monitoring and Analytics System
 * 
 * Provides comprehensive monitoring, logging, and analytics for BenPharm notification system
 */

export interface NotificationMetrics {
  totalSent: number;
  totalFailed: number;
  successRate: number;
  byChannel: Record<string, { sent: number; failed: number; successRate: number }>;
  byType: Record<string, { sent: number; failed: number; successRate: number }>;
  recentActivity: Array<{
    timestamp: Date;
    type: string;
    channel: string;
    status: string;
    recipient: string;
  }>;
}

export interface ProviderHealth {
  provider: string;
  channel: string;
  status: 'healthy' | 'degraded' | 'down';
  lastSuccess: Date | null;
  lastFailure: Date | null;
  successRate24h: number;
  averageResponseTime: number;
  errorCount24h: number;
}

/**
 * Notification monitoring service
 */
export class NotificationMonitor {
  private static instance: NotificationMonitor;
  
  private constructor() {}
  
  static getInstance(): NotificationMonitor {
    if (!NotificationMonitor.instance) {
      NotificationMonitor.instance = new NotificationMonitor();
    }
    return NotificationMonitor.instance;
  }
  
  /**
   * Get comprehensive notification metrics
   */
  async getMetrics(dateRange?: { from: Date; to: Date }): Promise<NotificationMetrics> {
    try {
      const whereClause = dateRange ? {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to
        }
      } : {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      };

      // Get total counts
      const totalStats = await db.notification.aggregate({
        where: whereClause,
        _count: {
          id: true
        }
      });

      // Get stats by status
      const statusStats = await db.notification.groupBy({
        by: ['status'],
        where: whereClause,
        _count: {
          id: true
        }
      });

      // Get stats by channel
      const channelStats = await db.notification.groupBy({
        by: ['channel', 'status'],
        where: whereClause,
        _count: {
          id: true
        }
      });

      // Get stats by type
      const typeStats = await db.notification.groupBy({
        by: ['type', 'status'],
        where: whereClause,
        _count: {
          id: true
        }
      });

      // Get recent activity
      const recentActivity = await db.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          createdAt: true,
          type: true,
          channel: true,
          status: true,
          recipient: true
        }
      });

      // Process stats
      const sentCount = statusStats.find(s => s.status === 'SENT')?._count.id || 0;
      const failedCount = statusStats.find(s => s.status === 'FAILED')?._count.id || 0;
      const totalCount = sentCount + failedCount;

      // Build channel stats
      const byChannel: Record<string, { sent: number; failed: number; successRate: number }> = {};
      channelStats.forEach(stat => {
        const channel = stat.channel;
        if (!byChannel[channel]) {
          byChannel[channel] = { sent: 0, failed: 0, successRate: 0 };
        }
        
        if (stat.status === 'SENT') {
          byChannel[channel].sent = stat._count.id;
        } else if (stat.status === 'FAILED') {
          byChannel[channel].failed = stat._count.id;
        }
      });

      // Calculate success rates for channels
      Object.keys(byChannel).forEach(channel => {
        const total = byChannel[channel].sent + byChannel[channel].failed;
        byChannel[channel].successRate = total > 0 ? (byChannel[channel].sent / total) * 100 : 0;
      });

      // Build type stats
      const byType: Record<string, { sent: number; failed: number; successRate: number }> = {};
      typeStats.forEach(stat => {
        const type = stat.type;
        if (!byType[type]) {
          byType[type] = { sent: 0, failed: 0, successRate: 0 };
        }
        
        if (stat.status === 'SENT') {
          byType[type].sent = stat._count.id;
        } else if (stat.status === 'FAILED') {
          byType[type].failed = stat._count.id;
        }
      });

      // Calculate success rates for types
      Object.keys(byType).forEach(type => {
        const total = byType[type].sent + byType[type].failed;
        byType[type].successRate = total > 0 ? (byType[type].sent / total) * 100 : 0;
      });

      return {
        totalSent: sentCount,
        totalFailed: failedCount,
        successRate: totalCount > 0 ? (sentCount / totalCount) * 100 : 0,
        byChannel,
        byType,
        recentActivity: recentActivity.map(activity => ({
          timestamp: activity.createdAt,
          type: activity.type,
          channel: activity.channel,
          status: activity.status,
          recipient: this.maskRecipient(activity.recipient)
        }))
      };
    } catch (error) {
      console.error('Error getting notification metrics:', error);
      throw error;
    }
  }
  
  /**
   * Get provider health status
   */
  async getProviderHealth(): Promise<ProviderHealth[]> {
    try {
      // Get notification data for last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const notifications = await db.notification.findMany({
        where: {
          createdAt: { gte: yesterday }
        },
        select: {
          channel: true,
          status: true,
          createdAt: true,
          sentAt: true
        }
      });
      
      // Group by channel to calculate provider health
      const channelData: Record<string, any> = {};
      
      notifications.forEach(notification => {
        const channel = notification.channel;
        if (!channelData[channel]) {
          channelData[channel] = {
            total: 0,
            successful: 0,
            failed: 0,
            responseTimes: []
          };
        }
        
        channelData[channel].total++;
        
        if (notification.status === 'SENT') {
          channelData[channel].successful++;
          
          // Calculate response time if available
          if (notification.sentAt) {
            const responseTime = notification.sentAt.getTime() - notification.createdAt.getTime();
            channelData[channel].responseTimes.push(responseTime);
          }
        } else if (notification.status === 'FAILED') {
          channelData[channel].failed++;
        }
      });
      
      // Build health status for each channel
      const healthStatus: ProviderHealth[] = [];
      
      Object.entries(channelData).forEach(([channel, data]) => {
        const successRate = data.total > 0 ? (data.successful / data.total) * 100 : 0;
        const averageResponseTime = data.responseTimes.length > 0 
          ? data.responseTimes.reduce((a: number, b: number) => a + b, 0) / data.responseTimes.length 
          : 0;
        
        let status: 'healthy' | 'degraded' | 'down' = 'healthy';
        if (successRate < 50) {
          status = 'down';
        } else if (successRate < 85) {
          status = 'degraded';
        }
        
        // Get last success and failure times
        const channelNotifications = notifications.filter(n => n.channel === channel);
        const lastSuccess = channelNotifications
          .filter(n => n.status === 'SENT')
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null;
        
        const lastFailure = channelNotifications
          .filter(n => n.status === 'FAILED')
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.createdAt || null;
        
        healthStatus.push({
          provider: this.getProviderName(channel),
          channel,
          status,
          lastSuccess,
          lastFailure,
          successRate24h: successRate,
          averageResponseTime: Math.round(averageResponseTime / 1000), // Convert to seconds
          errorCount24h: data.failed
        });
      });
      
      return healthStatus;
    } catch (error) {
      console.error('Error getting provider health:', error);
      throw error;
    }
  }
  
  /**
   * Get notification statistics for admin dashboard
   */
  async getAdminStats() {
    try {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      const [
        todayStats,
        yesterdayStats,
        weekStats,
        monthStats,
        totalStats
      ] = await Promise.all([
        this.getMetrics({ from: new Date(today.getFullYear(), today.getMonth(), today.getDate()), to: today }),
        this.getMetrics({ from: yesterday, to: today }),
        this.getMetrics({ from: lastWeek, to: today }),
        this.getMetrics({ from: lastMonth, to: today }),
        this.getMetrics() // All time
      ]);
      
      return {
        today: todayStats,
        yesterday: yesterdayStats,
        lastWeek: weekStats,
        lastMonth: monthStats,
        allTime: totalStats
      };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      throw error;
    }
  }
  
  /**
   * Log notification attempt for monitoring
   */
  async logNotificationAttempt(
    notificationId: string,
    provider: string,
    attempt: number,
    result: { success: boolean; error?: string; responseTime?: number }
  ) {
    try {
      // In a real implementation, you might want to use a separate logging service
      const logEntry = {
        timestamp: new Date(),
        notificationId,
        provider,
        attempt,
        success: result.success,
        error: result.error,
        responseTime: result.responseTime
      };
      
      console.log(`📊 Notification Log: ${JSON.stringify(logEntry)}`);
      
      // Optional: Store in separate monitoring database or send to external service
      // await monitoringService.log(logEntry);
      
    } catch (error) {
      console.error('Error logging notification attempt:', error);
      // Don't throw - logging failures shouldn't affect notification delivery
    }
  }
  
  /**
   * Check for notification delivery issues and alerts
   */
  async checkForAlerts(): Promise<Array<{ type: string; message: string; severity: 'low' | 'medium' | 'high' }>> {
    const alerts = [];
    
    try {
      const metrics = await this.getMetrics();
      
      // High failure rate alert
      if (metrics.successRate < 85) {
        alerts.push({
          type: 'high_failure_rate',
          message: `Notification success rate is ${metrics.successRate.toFixed(1)}% (below 85% threshold)`,
          severity: metrics.successRate < 50 ? 'high' : 'medium' as const
        });
      }
      
      // Check individual channel health
      Object.entries(metrics.byChannel).forEach(([channel, stats]) => {
        if (stats.successRate < 80) {
          alerts.push({
            type: 'channel_degraded',
            message: `${channel} channel success rate is ${stats.successRate.toFixed(1)}% (below 80% threshold)`,
            severity: stats.successRate < 50 ? 'high' : 'medium' as const
          });
        }
      });
      
      // Check for stuck notifications (pending for too long)
      const stuckNotifications = await db.notification.count({
        where: {
          status: 'PENDING',
          createdAt: {
            lt: new Date(Date.now() - 30 * 60 * 1000) // Older than 30 minutes
          }
        }
      });
      
      if (stuckNotifications > 0) {
        alerts.push({
          type: 'stuck_notifications',
          message: `${stuckNotifications} notifications have been pending for over 30 minutes`,
          severity: stuckNotifications > 10 ? 'high' : 'medium' as const
        });
      }
      
    } catch (error) {
      alerts.push({
        type: 'monitoring_error',
        message: `Failed to check notification metrics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'low' as const
      });
    }
    
    return alerts;
  }
  
  /**
   * Get delivery rate trends for the past week
   */
  async getDeliveryTrends(days: number = 7): Promise<Array<{ date: string; sent: number; failed: number; successRate: number }>> {
    try {
      const trends = [];
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);
        
        const dayStats = await this.getMetrics({ from: date, to: nextDate });
        
        trends.push({
          date: date.toISOString().split('T')[0],
          sent: dayStats.totalSent,
          failed: dayStats.totalFailed,
          successRate: dayStats.successRate
        });
      }
      
      return trends;
    } catch (error) {
      console.error('Error getting delivery trends:', error);
      throw error;
    }
  }
  
  /**
   * Get cost analysis for SMS notifications
   */
  async getCostAnalysis(dateRange?: { from: Date; to: Date }): Promise<{
    totalMessages: number;
    estimatedCost: number;
    costByChannel: Record<string, { messages: number; cost: number }>;
    avgCostPerMessage: number;
  }> {
    try {
      const metrics = await this.getMetrics(dateRange);
      
      // SMS cost calculation (Termii pricing for Nigeria)
      const smsCostPerMessage = 4; // ₦4 per SMS (average)
      const whatsappCostPerMessage = 0.5; // ₦0.5 per WhatsApp message
      const emailCostPerMessage = 0.1; // ₦0.1 per email
      
      const costByChannel: Record<string, { messages: number; cost: number }> = {};
      let totalCost = 0;
      let totalMessages = 0;
      
      Object.entries(metrics.byChannel).forEach(([channel, stats]) => {
        const messages = stats.sent;
        let cost = 0;
        
        switch (channel) {
          case 'sms':
            cost = messages * smsCostPerMessage;
            break;
          case 'whatsapp':
            cost = messages * whatsappCostPerMessage;
            break;
          case 'email':
            cost = messages * emailCostPerMessage;
            break;
        }
        
        costByChannel[channel] = { messages, cost };
        totalCost += cost;
        totalMessages += messages;
      });
      
      return {
        totalMessages,
        estimatedCost: totalCost,
        costByChannel,
        avgCostPerMessage: totalMessages > 0 ? totalCost / totalMessages : 0
      };
    } catch (error) {
      console.error('Error calculating cost analysis:', error);
      throw error;
    }
  }
  
  /**
   * Generate monitoring report for admins
   */
  async generateReport(): Promise<string> {
    try {
      const metrics = await this.getMetrics();
      const providerHealth = await this.getProviderHealth();
      const alerts = await this.checkForAlerts();
      const costAnalysis = await this.getCostAnalysis();
      const trends = await this.getDeliveryTrends(7);
      
      let report = '📊 BenPharm Notification System Report\n';
      report += '═'.repeat(50) + '\n';
      report += `Generated: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })}\n\n`;
      
      // Overall metrics
      report += '📈 Overall Metrics (Last 24 Hours)\n';
      report += `Total Sent: ${metrics.totalSent}\n`;
      report += `Total Failed: ${metrics.totalFailed}\n`;
      report += `Success Rate: ${metrics.successRate.toFixed(1)}%\n\n`;
      
      // Channel breakdown
      report += '📱 By Channel\n';
      Object.entries(metrics.byChannel).forEach(([channel, stats]) => {
        report += `${channel}: ${stats.sent} sent, ${stats.failed} failed (${stats.successRate.toFixed(1)}%)\n`;
      });
      report += '\n';
      
      // Cost analysis
      report += '💰 Cost Analysis\n';
      report += `Total Messages: ${costAnalysis.totalMessages}\n`;
      report += `Estimated Cost: ₦${costAnalysis.estimatedCost.toFixed(2)}\n`;
      report += `Avg Cost/Message: ₦${costAnalysis.avgCostPerMessage.toFixed(2)}\n\n`;
      
      // Alerts
      if (alerts.length > 0) {
        report += '🚨 Active Alerts\n';
        alerts.forEach(alert => {
          const severity = alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢';
          report += `${severity} ${alert.type}: ${alert.message}\n`;
        });
        report += '\n';
      }
      
      // Provider health
      report += '🏥 Provider Health\n';
      providerHealth.forEach(provider => {
        const statusIcon = provider.status === 'healthy' ? '✅' : provider.status === 'degraded' ? '⚠️' : '❌';
        report += `${statusIcon} ${provider.provider}: ${provider.successRate24h.toFixed(1)}% success rate\n`;
      });
      
      return report;
    } catch (error) {
      return `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }
  
  /**
   * Mask recipient information for privacy
   */
  private maskRecipient(recipient: string): string {
    if (recipient.includes('@')) {
      // Email
      const [local, domain] = recipient.split('@');
      return `${local.substring(0, 2)}***@${domain}`;
    } else {
      // Phone number
      return recipient.substring(0, 6) + '***' + recipient.slice(-4);
    }
  }
  
  /**
   * Get provider name for channel
   */
  private getProviderName(channel: string): string {
    const providerNames: Record<string, string> = {
      'sms': 'Termii SMS',
      'whatsapp': 'WhatsApp Business',
      'email': 'Resend Email'
    };
    
    return providerNames[channel] || `${channel} Provider`;
  }
}

// Export singleton instance
export const notificationMonitor = NotificationMonitor.getInstance();
