import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';
import Carte from '@/models/Carte';
import KycRequest from '@/models/KycRequest';

export async function GET() {
  await dbConnect();

  // Totaux globaux
  const [totalClients, totalCartes, kycValide, kycEnAttente, kycRejete] = await Promise.all([
    Client.countDocuments(),
    Carte.countDocuments(),
    KycRequest.countDocuments({ statutKyc: 'VALIDE', dateSubmission: { $exists: true } }),
    KycRequest.countDocuments({ statutKyc: 'EN_ATTENTE', dateSubmission: { $exists: true } }),
    KycRequest.countDocuments({ statutKyc: 'REJETE', dateSubmission: { $exists: true } }),
  ]);

  // Répartition par type de client
  const clientsByType = await Client.aggregate([
    { $group: { _id: '$typeClient', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Répartition par services utilisés
  const clientsByService = await Client.aggregate([
    { $unwind: { path: '$servicesUtilises', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$servicesUtilises', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Répartition des comptes (Cartes) par type
  const cartesByType = await Carte.aggregate([
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  // Clients enregistrés par mois (12 derniers mois)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const clientsPerMonth = await Client.aggregate([
    { $match: { createdAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } }
  ]);

  // Formater les données mensuelles (compléter les mois manquants)
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyData = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const found = clientsPerMonth.find(d => d._id.year === year && d._id.month === month);
    monthlyData.unshift({
      mois: monthNames[month - 1],
      clients: found?.count || 0
    });
  }
  monthlyData.reverse();

  // Top 5 pays de résidence
  const topPays = await Client.aggregate([
    { $group: { _id: '$paysResidence', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  return NextResponse.json({
    success: true,
    data: {
      totaux: { totalClients, totalCartes, kycValide, kycEnAttente, kycRejete },
      clientsByType: clientsByType.map(d => ({ name: d._id?.replace('_', ' ') || 'Inconnu', value: d.count })),
      clientsByService: clientsByService.map(d => ({ name: d._id?.replace('_', ' ') || 'Autre', value: d.count })),
      cartesByType: cartesByType.map(d => ({ name: d._id?.replace('_', ' ') || 'Autre', value: d.count })),
      monthlyData,
      topPays: topPays.map(d => ({ pays: d._id || 'Inconnu', count: d.count })),
    }
  });
}
