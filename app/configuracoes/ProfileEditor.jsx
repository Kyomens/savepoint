'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import SubmitButton from '@/components/SubmitButton';
import Cover from '@/components/Cover';
import { AVATAR_COLORS, BANNER_PRESETS, bannerStyle } from '@/lib/format';
import { updateProfile } from './actions';

const DICE_STYLES = [
  ['pixel-art', 'Pixel art'],
  ['bottts', 'Robôs'],
];
const diceUrl = (style, seed) => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

function TopGamePicker({ top, setTop }) {
  const [slot, setSlot] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (slot === null || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/jogos/busca?q=${encodeURIComponent(query)}`, { signal: ctrl.signal });
        setResults(res.ok ? await res.json() : []);
      } catch {}
      setLoading(false);
    }, 350);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, slot]);

  function choose(game) {
    const next = [...top];
    next[slot] = game;
    setTop(next);
    setSlot(null);
    setQuery('');
    setResults([]);
  }

  return (
    <div className="stack" style={{ gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        {top.map((g, i) => (
          <div key={i} className="stack" style={{ gap: 6 }}>
            <button type="button" className={`top-slot ${slot === i ? 'on' : ''}`} onClick={() => setSlot(slot === i ? null : i)}
              aria-label={g ? `Trocar ${g.name}` : `Escolher jogo ${i + 1}`}>
              {g ? <Cover game={g} /> : <span className="top-slot-empty">+</span>}
            </button>
            {g && (
              <button type="button" className="pill" style={{ minHeight: 28, padding: '2px 10px', justifyContent: 'center' }}
                onClick={() => { const next = [...top]; next[i] = null; setTop(next); }}>
                Remover
              </button>
            )}
          </div>
        ))}
      </div>
      {slot !== null && (
        <div className="card stack" style={{ gap: 10, padding: 14 }}>
          <label className="form-label">
            Buscar jogo para a posição {slot + 1}
            <input className="field" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite o nome do jogo…" />
          </label>
          {loading && <p className="muted small">Buscando…</p>}
          {!loading && query.trim().length >= 2 && results.length === 0 && <p className="muted small">Nada encontrado. Tente o nome em inglês.</p>}
          <div className="stack" style={{ gap: 6 }}>
            {results.map((r) => (
              <button key={r.id} type="button" className="search-result" onClick={() => choose(r)}>
                <Cover game={r} width={34} style={{ borderRadius: 4 }} />
                <span style={{ fontWeight: 600 }}>{r.name}</span>
                <span className="muted small">{r.release_year || ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfileEditor({ profile, topGames, artworks }) {
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [color, setColor] = useState(profile?.avatar_color || AVATAR_COLORS[0]);
  const [avatar, setAvatar] = useState({ mode: 'keep', url: profile?.avatar_url || '', preview: profile?.avatar_url || '' });
  const [banner, setBanner] = useState({ mode: 'keep', value: profile?.banner_url || '', preview: profile?.banner_url || '' });
  const [diceStyle, setDiceStyle] = useState('pixel-art');
  const [round, setRound] = useState(0);
  const [top, setTop] = useState(topGames);
  const avatarFile = useRef(null);
  const bannerFile = useRef(null);

  const seeds = Array.from({ length: 8 }, (_, i) => `${profile?.username}-${round}-${i}`);
  const showAvatar = avatar.mode === 'initial' ? '' : avatar.preview;
  const initial = (displayName || profile?.username || '?').trim().charAt(0).toUpperCase();

  function onAvatarFile(e) {
    const f = e.target.files?.[0];
    if (f) setAvatar({ mode: 'upload', url: '', preview: URL.createObjectURL(f) });
  }
  function onBannerFile(e) {
    const f = e.target.files?.[0];
    if (f) setBanner({ mode: 'upload', value: '', preview: URL.createObjectURL(f) });
  }

  return (
    <form action={updateProfile} className="stack" style={{ gap: 22 }}>
      <input type="hidden" name="avatar_mode" value={avatar.mode} />
      <input type="hidden" name="avatar_url" value={avatar.url} />
      <input type="hidden" name="avatar_color" value={color} />
      <input type="hidden" name="banner_mode" value={banner.mode} />
      <input type="hidden" name="banner_value" value={banner.value} />
      <input type="hidden" name="top_games" value={JSON.stringify(top.filter(Boolean).map((g) => ({ id: g.id, slug: g.slug })))} />

      {/* ---------- Pré-visualização ---------- */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 150, ...bannerStyle(banner.preview) }} />
        <div className="row" style={{ padding: '0 20px 20px', gap: 16, alignItems: 'flex-end', marginTop: -44, flexWrap: 'nowrap' }}>
          <span style={{ borderRadius: '50%', border: '4px solid var(--card)', display: 'inline-flex', flex: 'none' }}>
            {showAvatar ? (
              <img src={showAvatar} alt="" className="avatar" style={{ width: 88, height: 88, objectFit: 'cover', background: 'var(--line2)', imageRendering: showAvatar.includes('pixel-art') ? 'pixelated' : 'auto' }} />
            ) : (
              <span className="avatar" style={{ width: 88, height: 88, background: color, fontSize: 34 }}>{initial}</span>
            )}
          </span>
          <div style={{ minWidth: 0, paddingBottom: 4 }}>
            <p className="display" style={{ fontSize: 22, color: 'var(--strong)' }}>{displayName || profile?.username}</p>
            <p className="muted small">@{profile?.username}</p>
          </div>
        </div>
      </div>

      {/* ---------- Foto de perfil ---------- */}
      <section className="card stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: 17 }}>Foto de perfil</h2>
        <div className="row">
          <button type="button" className="btn" onClick={() => avatarFile.current?.click()}>Enviar foto</button>
          <input ref={avatarFile} type="file" name="avatar_file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onAvatarFile} tabIndex={-1} />
          <button type="button" className="btn" onClick={() => setAvatar({ mode: 'initial', url: '', preview: '' })}>Usar inicial e cor</button>
          <span className="muted small">JPG, PNG, WEBP ou GIF até 2 MB.</span>
        </div>
        {avatar.mode === 'initial' && (
          <div className="row" role="radiogroup" aria-label="Cor do avatar">
            {AVATAR_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Cor ${c}`} onClick={() => setColor(c)}
                className="swatch" style={{ background: c, border: 0, cursor: 'pointer', outline: color === c ? '3px solid var(--accent-text)' : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        )}
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small" style={{ fontWeight: 600 }}>Ou escolha um avatar aleatório</span>
            <div className="row" style={{ gap: 6 }}>
              {DICE_STYLES.map(([id, label]) => (
                <button key={id} type="button" className={`pill ${diceStyle === id ? 'on' : ''}`} onClick={() => setDiceStyle(id)}>{label}</button>
              ))}
              <button type="button" className="pill" onClick={() => setRound((r) => r + 1)}>Gerar outros</button>
            </div>
          </div>
          <div className="dice-grid">
            {seeds.map((seed) => {
              const url = diceUrl(diceStyle, seed);
              const on = avatar.mode === 'url' && avatar.url === url;
              return (
                <button key={url} type="button" className={`dice-option ${on ? 'on' : ''}`} aria-pressed={on} aria-label="Escolher este avatar"
                  onClick={() => setAvatar({ mode: 'url', url, preview: url })}>
                  <img src={url} alt="" loading="lazy" style={{ imageRendering: diceStyle === 'pixel-art' ? 'pixelated' : 'auto' }} />
                </button>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>Avatares gerados pelo DiceBear.</p>
        </div>
      </section>

      {/* ---------- Capa ---------- */}
      <section className="card stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: 17 }}>Capa do perfil</h2>
        <div className="row">
          <button type="button" className="btn" onClick={() => bannerFile.current?.click()}>Enviar imagem</button>
          <input ref={bannerFile} type="file" name="banner_file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={onBannerFile} tabIndex={-1} />
          <button type="button" className="btn" onClick={() => setBanner({ mode: 'none', value: '', preview: '' })}>Sem capa</button>
          <span className="muted small">Ideal: 1500 × 400 px, até 5 MB.</span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Cores prontas</span>
          <div className="banner-grid">
            {Object.keys(BANNER_PRESETS).map((id) => {
              const on = banner.mode === 'preset' && banner.value === id;
              return (
                <button key={id} type="button" className={`banner-option ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`Capa ${id}`}
                  style={{ background: BANNER_PRESETS[id] }} onClick={() => setBanner({ mode: 'preset', value: id, preview: `preset:${id}` })} />
              );
            })}
          </div>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Arte dos seus jogos</span>
          {artworks.length === 0 ? (
            <p className="muted small">Escolha seus jogos favoritos abaixo ou marque jogos no site, e as artes deles aparecem aqui.</p>
          ) : (
            <div className="banner-grid">
              {artworks.map((a) => {
                const on = banner.mode === 'artwork' && banner.value === a.url;
                return (
                  <button key={a.url} type="button" className={`banner-option ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`Arte de ${a.name}`} title={a.name}
                    style={{ backgroundImage: `url("${a.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    onClick={() => setBanner({ mode: 'artwork', value: a.url, preview: a.url })} />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ---------- Nome e bio ---------- */}
      <section className="card stack" style={{ gap: 16 }}>
        <label className="form-label">
          Nome de exibição
          <input className="field" name="display_name" maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="form-label">
          Bio
          <textarea className="field" name="bio" maxLength={300} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Que tipo de jogo você curte?" />
          <span className="hint">{bio.length}/300</span>
        </label>
      </section>

      {/* ---------- Top 4 ---------- */}
      <section className="card stack" style={{ gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 17 }}>Top 4 de todos os tempos</h2>
          <p className="muted small">Clique em um espaço e busque o jogo. Não precisa ter avaliado.</p>
        </div>
        <TopGamePicker top={top} setTop={setTop} />
      </section>

      <div className="row">
        <SubmitButton pendingText="Salvando…">Salvar perfil</SubmitButton>
      </div>
    </form>
  );
}
