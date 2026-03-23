import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
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
        password: adminPassword,
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
      password: adminPassword,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
