import { runComptaScheduledReport } from '@/lib/compta-scheduled-report';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return runComptaScheduledReport(req, {
    recipient: 'profzzen@gmail.com',
    force: true,
    scheduleLabel: '16:00-GMT-test',
    requireCronSecret: false,
  });
}

export async function POST(req: Request) {
  return runComptaScheduledReport(req, {
    recipient: 'profzzen@gmail.com',
    force: true,
    scheduleLabel: '16:00-GMT-test',
    requireCronSecret: false,
  });
}
