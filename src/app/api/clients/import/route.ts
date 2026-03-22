import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Client from '@/models/Client';

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizePhone(raw: string): string {
  if (!raw) return '';
  const firstChunk = raw.split(':::')[0]?.trim() || raw.trim();
  const cleaned = firstChunk.replace(/[\u00A0\s\-()]/g, '');
  return cleaned;
}

function splitName(firstName: string, lastName: string, middleName: string): { prenom: string; nom: string } {
  const f = (firstName || '').trim();
  const l = (lastName || '').trim();
  const m = (middleName || '').trim();

  if (f && l) {
    return { prenom: f, nom: l };
  }

  if (f && !l) {
    const parts = f.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      return { prenom: parts[0], nom: m || 'Client' };
    }
    return {
      prenom: parts[0],
      nom: parts.slice(1).join(' '),
    };
  }

  if (!f && l) {
    return { prenom: m || 'Contact', nom: l };
  }

  return { prenom: 'Contact', nom: 'Importe' };
}

function detectServices(text: string): string[] {
  const value = text.toLowerCase();
  const services = new Set<string>();

  if (/zelle/.test(value)) services.add('ZELLE');
  if (/cash\s*app|cashapp/.test(value)) services.add('CASH_APP');
  if (/paypal/.test(value)) services.add('PAYPAL');
  if (/wire|swift|western\s*union|transfer/.test(value)) services.add('WIRE');
  if (/wise/.test(value)) services.add('WISE');
  if (/euro|sepa/.test(value)) services.add('EURO');
  if (/crypto|binance|btc|bitcoin|usdt|eth|kucoin|wallet/.test(value)) services.add('CRYPTO');

  if (services.size === 0) {
    services.add('AUTRE');
  }

  return Array.from(services);
}

function countryFromPhone(phone: string): string {
  if (!phone.startsWith('+')) return 'INCONNU';
  if (phone.startsWith('+228')) return 'TOGO';
  if (phone.startsWith('+229')) return 'BENIN';
  if (phone.startsWith('+225')) return 'COTE DIVOIRE';
  if (phone.startsWith('+234')) return 'NIGERIA';
  if (phone.startsWith('+233')) return 'GHANA';
  if (phone.startsWith('+221')) return 'SENEGAL';
  if (phone.startsWith('+223')) return 'MALI';
  if (phone.startsWith('+254')) return 'KENYA';
  if (phone.startsWith('+971')) return 'EAU';
  if (phone.startsWith('+1')) return 'USA';
  return 'INCONNU';
}

function makeImportEmail(prenom: string, nom: string, phone: string, rowIndex: number): string {
  const localBase = `${prenom}.${nom}`
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '') || 'client';

  const phoneSuffix = phone.replace(/[^0-9]/g, '').slice(-6);
  const suffix = phoneSuffix || String(rowIndex);
  return `${localBase}.${suffix}@import.nbbc.local`;
}

export async function POST(request: Request) {
  try {
    await dbConnect();

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Fichier CSV requis.' }, { status: 400 });
    }

    const raw = await file.text();
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      return NextResponse.json({ success: false, error: 'CSV vide ou invalide.' }, { status: 400 });
    }

    const header = parseCsvLine(lines[0]);

    const indexOf = (name: string) => header.indexOf(name);
    const idx = {
      firstName: indexOf('First Name'),
      middleName: indexOf('Middle Name'),
      lastName: indexOf('Last Name'),
      orgName: indexOf('Organization Name'),
      email: indexOf('E-mail 1 - Value'),
      phone1: indexOf('Phone 1 - Value'),
      phone2: indexOf('Phone 2 - Value'),
      phone3: indexOf('Phone 3 - Value'),
      country: indexOf('Address 1 - Country'),
      customValue: indexOf('Custom Field 1 - Value'),
      notes: indexOf('Notes'),
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = parseCsvLine(lines[i]);

      const firstName = (row[idx.firstName] || '').trim();
      const middleName = (row[idx.middleName] || '').trim();
      const lastName = (row[idx.lastName] || '').trim();
      const orgName = (row[idx.orgName] || '').trim();
      const explicitEmail = (row[idx.email] || '').trim().toLowerCase();
      const phoneRaw = (row[idx.phone1] || row[idx.phone2] || row[idx.phone3] || '').trim();
      const phone = normalizePhone(phoneRaw);
      const notes = (row[idx.notes] || '').trim();
      const customValue = (row[idx.customValue] || '').trim();
      const providedCountry = (row[idx.country] || '').trim();

      const sourceText = [firstName, middleName, lastName, orgName, notes, customValue].join(' ');
      const hasIdentity = sourceText.trim() || phone || explicitEmail;

      if (!hasIdentity) {
        skipped++;
        continue;
      }

      const { prenom, nom } = splitName(firstName || orgName, lastName, middleName);
      const services = detectServices(sourceText);
      const paysResidence = (providedCountry || countryFromPhone(phone) || 'INCONNU').toUpperCase();
      const email = explicitEmail || makeImportEmail(prenom, nom, phone, i);

      const query: any[] = [];
      if (email) query.push({ email });
      if (phone) query.push({ telephone: phone });

      const existing = query.length > 0 ? await Client.findOne({ $or: query }) : null;

      if (existing) {
        const mergedServices = Array.from(new Set([...(existing.servicesUtilises || []), ...services]));
        const nextData: any = {
          servicesUtilises: mergedServices,
        };

        if (!existing.telephone && phone) nextData.telephone = phone;
        if ((!existing.paysResidence || existing.paysResidence === 'INCONNU') && paysResidence) nextData.paysResidence = paysResidence;
        if (!existing.prenom && prenom) nextData.prenom = prenom;
        if (!existing.nom && nom) nextData.nom = nom;

        await Client.updateOne({ _id: existing._id }, { $set: nextData });
        updated++;
      } else {
        const emailConflict = await Client.findOne({ email });
        const safeEmail = emailConflict ? makeImportEmail(prenom, nom, phone, i + 100000) : email;

        await Client.create({
          prenom,
          nom,
          email: safeEmail,
          telephone: phone || undefined,
          paysResidence,
          typeClient: 'PARTICULIER',
          statutKyc: 'EN_ATTENTE',
          niveauRisque: 'FAIBLE',
          statutCompte: 'ACTIF',
          servicesUtilises: services,
        });
        created++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        totalRows: lines.length - 1,
        created,
        updated,
        skipped,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
