import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Fichier CSV requis.' }, { status: 400 });
    }

    const raw = await file.text();
    const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);

    if (lines.length < 1) {
      return NextResponse.json({ success: false, error: 'CSV vide.' }, { status: 400 });
    }

    const header = parseCsvLine(lines[0]);

    // Suggested mappings for common column names
    const suggestions = {
      firstName: 'First Name',
      lastName: 'Last Name',
      middleName: 'Middle Name',
      email: 'E-mail 1 - Value',
      phone: 'Phone 1 - Value',
      country: 'Address 1 - Country',
      company: 'Organization Name',
      customField: 'Custom Field 1 - Value',
      notes: 'Notes',
    };

    // Try to auto-detect columns
    const detectedMapping: Record<string, string | null> = {
      firstName: null,
      lastName: null,
      middleName: null,
      email: null,
      phone: null,
      country: null,
      company: null,
      customField: null,
      notes: null,
    };

    for (const [key, suggestedName] of Object.entries(suggestions)) {
      const found = header.find(
        (col) => col.toLowerCase() === suggestedName.toLowerCase()
      );
      if (found) {
        detectedMapping[key] = found;
      }
    }

    // Sample 5 data rows for preview
    const sampleRows = [];
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const row = parseCsvLine(lines[i]);
      const rowObject: Record<string, string> = {};
      header.forEach((col, idx) => {
        rowObject[col] = row[idx] || '';
      });
      sampleRows.push(rowObject);
    }

    return NextResponse.json({
      success: true,
      data: {
        columns: header,
        detectedMapping,
        sampleRows,
        totalRows: lines.length - 1,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
