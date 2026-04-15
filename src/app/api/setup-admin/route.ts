import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== 'SUPER_ADMIN') {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    await dbConnect();

    const adminEmail = 'admin@nbbc.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      await User.updateOne(
        { _id: existingAdmin._id },
        {
          $set: {
            role: 'SUPER_ADMIN',
            password: hashedPassword,
            name: existingAdmin.name || 'Super Admin',
          },
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Admin prêt.',
        email: adminEmail,
      });
    }

    const admin = await User.create({
      name: 'Super Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'SUPER_ADMIN'
    });

    return NextResponse.json({
      success: true,
      message: 'Admin créé.',
      email: admin.email,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
