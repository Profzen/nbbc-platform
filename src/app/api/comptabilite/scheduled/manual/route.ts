import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runComptaScheduledReport } from '@/lib/compta-scheduled-report';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !(session.user as any)?.role || (session.user as any)?.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ success: false, error: 'Acces refuse' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const recipient = String(body?.recipient || '').trim().toLowerCase();

  if (!recipient) {
    return NextResponse.json({ success: false, error: 'Destinataire requis' }, { status: 400 });
  }

  return runComptaScheduledReport(req, {
    recipient,
    force: true,
    scheduleLabel: 'dashboard-manuel',
    requireCronSecret: false,
  });
}
