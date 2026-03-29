type LoadingSpinnerProps = {
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
};

const sizeClasses: Record<NonNullable<LoadingSpinnerProps['size']>, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-[3px]',
};

export default function LoadingSpinner({
  label = 'Chargement...',
  className = '',
  size = 'md',
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-slate-500 ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full border-slate-300 border-t-blue-600 animate-spin`} />
      <p className="text-sm">{label}</p>
    </div>
  );
}
