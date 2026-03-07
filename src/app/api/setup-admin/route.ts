import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();
    
    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'SUPER_ADMIN' });
    if (adminExists) {
      return NextResponse.json({ message: "Admin exists." });
    }
    
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = await User.create({
      name: "Super Admin",
      email: "admin@nbbc.com",
      password: hashedPassword,
      role: "SUPER_ADMIN"
    });
    
    return NextResponse.json({ success: true, message: "Admin created", email: admin.email });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
