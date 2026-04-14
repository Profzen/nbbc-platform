import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Tous les champs sont requis." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit faire au moins 6 caractères." }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    await dbConnect();

    // Vérifier si l'email existe
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: "Un compte existe déjà avec cette adresse email." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'TONTINE_CLIENT'
    });

    return NextResponse.json({ success: true, message: "Compte créé avec succès.", user: { id: user._id, email: user.email, role: user.role } });

  } catch (error: any) {
    console.error("Erreur Inscription:", error);
    return NextResponse.json({ error: "Erreur serveur lors de la création du compte." }, { status: 500 });
  }
}
