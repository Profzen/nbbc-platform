import { runComptaScheduledReport } from '@/lib/compta-scheduled-report';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return runComptaScheduledReport(req, { requireCronSecret: true });
}

export async function POST(req: Request) {
  return runComptaScheduledReport(req, { requireCronSecret: true });
}
