import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import KycRequest from '@/models/KycRequest';
import SidebarClient from './SidebarClient';

export default async function Sidebar() {
  const session = await getServerSession(authOptions);
  if (!session) return null;

  await dbConnect();
  const pendingKyc = await KycRequest.countDocuments({ 
    dateSubmission: { $exists: true, $ne: null }, 
    statutKyc: 'EN_ATTENTE' 
  });

  return <SidebarClient session={session} pendingKyc={pendingKyc} />;
}

