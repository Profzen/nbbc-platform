import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import TemplateContrat from '@/models/TemplateContrat';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function textToHtmlContract(content: string): string {
  const normalized = (content || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return '';

  return normalized
    .split(/\n{2,}/)
    .map((block) => `<p>${escapeHtml(block).replace(/\n/g, '<br/>')}</p>`)
    .join('\n');
}

function htmlToTextFallback(html: string): string {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

export async function GET() {
  try {
    await dbConnect();
    const templates = await TemplateContrat.find({ actif: true }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: templates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const contenuTexte = typeof body.contenuTexte === 'string' ? body.contenuTexte.trim() : '';
    const contenuHtmlInput = typeof body.contenuHtml === 'string' ? body.contenuHtml.trim() : '';
    const contenuHtml = contenuTexte ? textToHtmlContract(contenuTexte) : contenuHtmlInput;
    const texteSauvegarde = contenuTexte || htmlToTextFallback(contenuHtmlInput);
    
    if (!body.nom || !contenuHtml) {
      return NextResponse.json({ success: false, error: 'Nom et contenu du contrat requis.' }, { status: 400 });
    }

    const template = await TemplateContrat.create({
      nom: body.nom,
      contenuHtml,
      contenuTexte: texteSauvegarde,
      actif: true
    });
    
    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
