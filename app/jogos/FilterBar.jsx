'use client';
import { useRouter } from 'next/navigation';
import { SORTS, GENRES, PLATFORMS } from '@/lib/format';

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: thisYear + 2 - 1980 }, (_, i) => thisYear + 1 - i);

export default function FilterBar({ q, ordem, genero, plataforma, ano }) {
  const router = useRouter();

  function go(changes) {
    const params = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(changes)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    params.delete('pagina');
    router.push(`/jogos${params.toString() ? `?${params}` : ''}`);
  }

  const hasFilters = q || genero || plataforma || ano || (ordem && ordem !== 'populares');

  return (
    <div className="filter-bar">
      <form
        role="search"
        className="row"
        style={{ flex: '1 1 320px', flexWrap: 'nowrap' }}
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: new FormData(e.currentTarget).get('q') });
        }}
      >
        <label className="sr-only" htmlFor="busca">Buscar jogos</label>
        <input id="busca" key={q} className="field" type="search" name="q" defaultValue={q} placeholder="Buscar pelo nome…" />
        <button className="btn btn-accent" type="submit">Buscar</button>
      </form>
      <div className="filter-selects">
        <label>
          <span className="sr-only">Ordenar por</span>
          <select className="field" value={ordem} disabled={!!q} onChange={(e) => go({ ordem: e.target.value === 'populares' ? '' : e.target.value })}
            title={q ? 'Na busca, os resultados vêm por relevância' : 'Ordenar por'}>
            {SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Gênero</span>
          <select className="field" value={genero} onChange={(e) => go({ genero: e.target.value })}>
            <option value="">Todos os gêneros</option>
            {GENRES.map((g) => <option key={g.id} value={g.id}>{g.pt}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Plataforma</span>
          <select className="field" value={plataforma} onChange={(e) => go({ plataforma: e.target.value })}>
            <option value="">Todas as plataformas</option>
            {PLATFORMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Ano de lançamento</span>
          <select className="field" value={ano} onChange={(e) => go({ ano: e.target.value })}>
            <option value="">Qualquer ano</option>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        {hasFilters && (
          <button type="button" className="pill" onClick={() => router.push('/jogos')}>Limpar filtros</button>
        )}
      </div>
    </div>
  );
}
