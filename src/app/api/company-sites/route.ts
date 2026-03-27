import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import CompanySite from '@/models/CompanySite';

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }
  return session;
}

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    await dbConnect();
    const data = await CompanySite.find({}, { name: 1, publicUrl: 1, adminUrl: 1, order: 1 })
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const publicUrl = String(body?.publicUrl || '').trim();
    const adminUrl = String(body?.adminUrl || '').trim();

    if (!name) {
      return NextResponse.json({ success: false, error: 'Le nom du site est requis.' }, { status: 400 });
    }

    await dbConnect();
    const count = await CompanySite.countDocuments();

    const site = await CompanySite.create({
      name,
      publicUrl,
      adminUrl,
      order: count,
    });

    return NextResponse.json({ success: true, data: site }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body?.id || '').trim();
    const name = String(body?.name || '').trim();
    const publicUrl = String(body?.publicUrl || '').trim();
    const adminUrl = String(body?.adminUrl || '').trim();

    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'Identifiant et nom du site requis.' }, { status: 400 });
    }

    await dbConnect();

    const site = await CompanySite.findByIdAndUpdate(
      id,
      {
        name,
        publicUrl,
        adminUrl,
      },
      { new: true }
    ).lean();

    if (!site) {
      return NextResponse.json({ success: false, error: 'Site introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: site });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Accès refusé.' }, { status: 403 });
    }

    const body = await request.json();
    const id = String(body?.id || '').trim();

    if (!id) {
      return NextResponse.json({ success: false, error: 'Identifiant du site requis.' }, { status: 400 });
    }

    await dbConnect();
    const deleted = await CompanySite.findByIdAndDelete(id).lean();

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Site introuvable.' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
