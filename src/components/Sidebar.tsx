import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';
import TontineAdhesionEcheance from '@/models/TontineAdhesionEcheance';
import SidebarClient from './SidebarClient';

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  const role = (session.user as any)?.role;
  const isStaff = role === 'SUPER_ADMIN' || role === 'AGENT';

  await dbConnect();
  const [pendingKyc, pendingTontineValidations] = await Promise.all([
    KycRequest.countDocuments({ 
      dateSubmission: { $exists: true, $ne: null }, 
      statutKyc: 'EN_ATTENTE' 
    }),
    isStaff
      ? TontineAdhesionEcheance.countDocuments({ validationStatus: 'PENDING' })
      : Promise.resolve(0),
  ]);

  return <SidebarClient session={session} pendingKyc={pendingKyc} pendingTontineValidations={pendingTontineValidations} />;
}

