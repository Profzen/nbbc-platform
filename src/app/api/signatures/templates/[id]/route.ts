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

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();
    const body = await request.json();

    const payload: Record<string, unknown> = {};

    if (typeof body.nom === 'string') {
      payload.nom = body.nom;
    }

    const contenuTexte = typeof body.contenuTexte === 'string' ? body.contenuTexte.trim() : '';
    const contenuHtmlInput = typeof body.contenuHtml === 'string' ? body.contenuHtml.trim() : '';

    if (contenuTexte || contenuHtmlInput) {
      const contenuHtml = contenuTexte ? textToHtmlContract(contenuTexte) : contenuHtmlInput;
      const texteSauvegarde = contenuTexte || htmlToTextFallback(contenuHtmlInput);
      payload.contenuHtml = contenuHtml;
      payload.contenuTexte = texteSauvegarde;
    }

    if (!Object.keys(payload).length) {
      return NextResponse.json({ success: false, error: 'Aucune donnée à mettre à jour.' }, { status: 400 });
    }

    const template = await TemplateContrat.findByIdAndUpdate(id, payload, { new: true });
    
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: template });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await dbConnect();

    // Au lieu de supprimer on le désactive pour préserver l'historique des signatures passées
    const template = await TemplateContrat.findByIdAndUpdate(id, { actif: false }, { new: true });
    
    if (!template) {
      return NextResponse.json({ success: false, error: 'Template introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Template désactivé avec succès' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
