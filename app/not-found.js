import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container page stack" style={{ maxWidth: 520, gap: 14, textAlign: 'center', alignItems: 'center' }}>
      <h1 className="display" style={{ fontSize: 40 }}>Game over</h1>
      <p className="muted">Não encontramos essa página.</p>
      <Link href="/" className="btn btn-accent">Voltar ao início</Link>
    </main>
  );
}
