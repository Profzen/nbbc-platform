import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';

// Étendre le type jsPDF pour inclure autoTable
interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

export const generateKycPdf = (request: any) => {
  const doc = new jsPDF() as jsPDFWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(30, 58, 95); // Navy Blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("CERTIFICAT DE VÉRIFICATION KYC", pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("NBBC PLATFORM - SYSTÈME DE CONFORMITÉ SÉCURISÉ", pageWidth / 2, 30, { align: 'center' });

  // Body
  doc.setTextColor(33, 41, 55);
  doc.setFontSize(12);
  doc.text(`Rapport généré le : ${new Date().toLocaleDateString('fr-FR')}`, 20, 50);
  doc.text(`ID de la demande : ${request._id}`, 20, 57);

  // Status Badge
  const statusColor = request.statutKyc === 'VALIDE' ? [16, 185, 129] : [245, 158, 11]; // Green or Orange
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(140, 43, 50, 10, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(request.statutKyc === 'VALIDE' ? "STATUT : VALIDÉ" : "STATUT : EN ATTENTE", 165, 50, { align: 'center' });

  // Client Info Table
  doc.autoTable({
    startY: 70,
    head: [['INFORMATIONS DU CLIENT', '']],
    body: [
      ['Nom complet', `${request.prenom} ${request.nom}`],
      ['Email', request.email],
      ['Téléphone', request.telephone || 'Non renseigné'],
      ['Cible', request.cible || 'Standard'],
      ['Date de soumission', request.dateSubmission ? new Date(request.dateSubmission).toLocaleDateString('fr-FR') : 'N/A'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } }
  });

  // Verification Details
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setTextColor(30, 58, 95);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("DÉTAILS DE LA PIÈCE D'IDENTITÉ", 20, finalY);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Le client a fourni une pièce d'identité officielle ainsi qu'un selfie de vérification en direct.", 20, finalY + 7);

  // Notes
  if (request.notesAdmin) {
    doc.autoTable({
      startY: finalY + 15,
      head: [['NOTES DE CONFORMITÉ', '']],
      body: [[request.notesAdmin]],
      theme: 'grid',
      headStyles: { fillColor: [100, 116, 139] },
    });
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const footerText = "Ce document est généré automatiquement par la plateforme NBBC et sert de preuve de vérification d'identité.";
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });
  doc.text("NBBC PLATFORM © 2026 - TOUS DROITS RÉSERVÉS", pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Save the PDF
  doc.save(`Rapport_KYC_${request.nom}_${request._id.substring(0, 8)}.pdf`);
};
