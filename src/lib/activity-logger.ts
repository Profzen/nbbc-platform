import dbConnect from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

export async function logActivity(action: string, detail?: string, user?: { id?: string; name?: string; role?: string }) {
  try {
    await dbConnect();
    await ActivityLog.create({
      action,
      detail,
      userId: user?.id,
      userName: user?.name,
      userRole: user?.role,
    });
  } catch {
    // Ne jamais bloquer l'action principale si le log échoue
  }
}
