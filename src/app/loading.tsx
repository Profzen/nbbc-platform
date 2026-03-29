import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-slate-50">
      <LoadingSpinner size="lg" label="Chargement de la page..." />
    </div>
  );
}
