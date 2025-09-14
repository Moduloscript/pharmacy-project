import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@saas/auth/lib/server';
import { db } from '@repo/database';

// GET /api/notification-preferences/history
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const history = await db.notificationPreferenceHistory.findMany({
      where: { customerId: session.user.id },
      orderBy: { timestamp: 'desc' },
      take: Math.min(limit, 100), // Cap at 100 entries
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching preference history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch preference history' },
      { status: 500 }
    );
  }
}
