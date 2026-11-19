'use client';
import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, pendingText = 'Salvando…', className = 'btn btn-accent', ...rest }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} {...rest}>
      {pending ? pendingText : children}
    </button>
  );
}
