import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });
  }

  await dbConnect();
  const { searchParams } = new URL(request.url);
  const skip = parseInt(searchParams.get('skip') || '0', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  const [logs, total] = await Promise.all([
    ActivityLog.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ActivityLog.countDocuments({}),
  ]);

  return NextResponse.json({ success: true, data: logs, total, hasMore: skip + limit < total });
}
