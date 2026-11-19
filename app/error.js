'use client';

export default function Error({ error, reset }) {
  return (
    <main className="container page stack" style={{ maxWidth: 560, gap: 14 }}>
      <h1 className="display" style={{ fontSize: 30 }}>Algo deu errado</h1>
      <p className="muted">{error?.message || 'Erro inesperado.'}</p>
      <div><button className="btn btn-accent" onClick={() => reset()}>Tentar de novo</button></div>
    </main>
  );
}
