import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET() {
  await dbConnect();
  const clients = await Client.find({}).sort({ createdAt: -1 });

  const headers = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Pays', 'Type', 'Services', 'Date inscription'];
  const rows = clients.map(c => [
    c.prenom, c.nom, c.email,
    c.telephone || '',
    c.paysResidence,
    c.typeClient,
    (c.servicesUtilises || []).join(' | '),
    new Date(c.createdAt).toLocaleDateString('fr-FR')
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new Response('\uFEFF' + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="clients_nbbc_${new Date().toISOString().split('T')[0]}.csv"`,
    }
  });
}
