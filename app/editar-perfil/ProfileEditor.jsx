'use client';
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from 'react';
import SubmitButton from '@/components/SubmitButton';
import Cover from '@/components/Cover';
import Avatar from '@/components/Avatar';
import ImageCropper from '@/components/ImageCropper';
import { getBrowserClient } from '@/lib/supabase/client';
import { AVATAR_COLORS, BANNER_PRESETS, PROFILE_THEMES, AVATAR_FRAMES, bannerStyle, profileThemeVars, spotifyEmbed } from '@/lib/format';
import { badgeName } from '@/lib/badges';
import { updateProfile } from './actions';

const DICE_STYLES = [
  ['pixel-art', 'Pixel art'],
  ['bottts', 'Robôs'],
];
const diceUrl = (style, seed) => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
const EXT = { 'image/webp': 'webp', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif' };

async function uploadProfileImage(userId, blob, kind) {
  const supabase = getBrowserClient();
  const type = blob.type || 'image/webp';
  const path = `${userId}/${kind}-${Date.now()}.${EXT[type] || 'webp'}`;
  const { error } = await supabase.storage.from('profile-images').upload(path, blob, { contentType: type });
  if (error) throw new Error('Não foi possível enviar a imagem. Tente uma imagem menor (até 5 MB).');
  return supabase.storage.from('profile-images').getPublicUrl(path).data.publicUrl;
}

function Lock({ requires }) {
  return <span className="lock-tag" title={`Desbloqueie com a insígnia ${badgeName(requires)}`}>🔒 {badgeName(requires)}</span>;
}

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, maxWidth: 480 }}>
        {top.map((g, i) => (
          <div key={i} className="stack" style={{ gap: 6 }}>
            <button type="button" className={`top-slot ${slot === i ? 'on' : ''}`} onClick={() => setSlot(slot === i ? null : i)}
              aria-label={g ? `Trocar ${g.name}` : `Escolher favorito ${i + 1}`}>
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
            Buscar jogo para o favorito {slot + 1}
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

export default function ProfileEditor({ profile, topGames, artworks, earned, platinumGames }) {
  const has = (badge) => !badge || earned.includes(badge);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [color, setColor] = useState(profile?.avatar_color || AVATAR_COLORS[0]);
  const [avatar, setAvatar] = useState({ mode: 'keep', url: profile?.avatar_url || '' });
  const [frame, setFrame] = useState(profile?.avatar_frame || '');
  const [banner, setBanner] = useState({ mode: 'keep', value: profile?.banner_url || '' });
  const [bannerPos, setBannerPos] = useState(profile?.banner_pos ?? 50);
  const [theme, setTheme] = useState(profile?.profile_theme || 'padrao');
  const [diceStyle, setDiceStyle] = useState('pixel-art');
  const [round, setRound] = useState(0);
  const [top, setTop] = useState(topGames);
  const [cropping, setCropping] = useState(null); // { kind: 'avatar' | 'banner', file }
  const [soundGame, setSoundGame] = useState(profile?.soundtrack_game_id ? String(profile.soundtrack_game_id) : '');
  const [soundUrl, setSoundUrl] = useState(profile?.soundtrack_url || '');
  const [fileError, setFileError] = useState('');
  const avatarFile = useRef(null);
  const bannerFile = useRef(null);

  const seeds = Array.from({ length: 8 }, (_, i) => `${profile?.username}-${round}-${i}`);
  const previewProfile = {
    ...profile,
    display_name: displayName,
    avatar_color: color,
    avatar_url: avatar.mode === 'initial' ? null : avatar.url || null,
  };
  const bannerValue = banner.mode === 'none' ? '' : banner.value;
  const canSoundtrack = earned.includes('platinador');
  const embed = spotifyEmbed(soundUrl);

  function pickFile(e, kind) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!EXT[f.type]) return setFileError('Use uma imagem JPG, PNG, WEBP ou GIF.');
    if (f.size > 10 * 1024 * 1024) return setFileError('Imagem muito grande (máximo 10 MB antes do recorte).');
    setFileError('');
    setCropping({ kind, file: f });
  }

  async function onCropped(blob) {
    if (blob.size > 5 * 1024 * 1024) throw new Error('A imagem final passou de 5 MB. Recorte uma área menor ou use outra imagem.');
    const url = await uploadProfileImage(profile.id, blob, cropping.kind === 'avatar' ? 'avatar' : 'capa');
    if (cropping.kind === 'avatar') setAvatar({ mode: 'uploaded', url });
    else {
      setBanner({ mode: 'uploaded', value: url });
      setBannerPos(50);
    }
    setCropping(null);
  }

  return (
    <form action={updateProfile} className="stack" style={{ gap: 22 }}>
      <input type="hidden" name="avatar_mode" value={avatar.mode} />
      <input type="hidden" name="avatar_url" value={avatar.url} />
      <input type="hidden" name="avatar_color" value={color} />
      <input type="hidden" name="avatar_frame" value={frame} />
      <input type="hidden" name="banner_mode" value={banner.mode} />
      <input type="hidden" name="banner_value" value={banner.value} />
      <input type="hidden" name="banner_pos" value={bannerPos} />
      <input type="hidden" name="profile_theme" value={theme} />
      <input type="hidden" name="top_games" value={JSON.stringify(top.filter(Boolean).map((g) => ({ id: g.id, slug: g.slug })))} />
      <input type="hidden" name="soundtrack_game_id" value={soundGame} />
      <input type="hidden" name="soundtrack_url" value={soundUrl} />

      {cropping && (
        <ImageCropper
          file={cropping.file}
          title={cropping.kind === 'avatar' ? 'Ajustar foto de perfil' : 'Ajustar capa do perfil'}
          aspect={cropping.kind === 'avatar' ? 1 : 4}
          round={cropping.kind === 'avatar'}
          outWidth={cropping.kind === 'avatar' ? 400 : 1600}
          outHeight={400}
          onCancel={() => setCropping(null)}
          onDone={onCropped}
        />
      )}

      {/* ---------- Pré-visualização ---------- */}
      <div className="card profile-themed" style={{ padding: 0, overflow: 'hidden', ...profileThemeVars(theme) }}>
        <div style={{ height: 150, ...bannerStyle(bannerValue, bannerPos) }} />
        <div className="row" style={{ padding: '0 20px 20px', gap: 16, alignItems: 'flex-end', marginTop: -44, flexWrap: 'nowrap' }}>
          <span style={{ borderRadius: '50%', border: '4px solid var(--card)', display: 'inline-flex', flex: 'none', background: 'var(--card)' }}>
            <Avatar profile={previewProfile} size={88} frame={frame || null} />
          </span>
          <div style={{ minWidth: 0, paddingBottom: 4 }}>
            <p className="display" style={{ fontSize: 22, color: 'var(--strong)' }}>{displayName || profile?.username}</p>
            <p className="muted small">@{profile?.username}</p>
          </div>
          <span className="btn btn-accent" style={{ marginLeft: 'auto', pointerEvents: 'none' }}>Seguir</span>
        </div>
      </div>
      {fileError && <p className="error" role="alert">{fileError}</p>}

      {/* ---------- Nome ---------- */}
      <section className="card stack" style={{ gap: 16 }}>
        <label className="form-label">
          Nome de exibição
          <input className="field" name="display_name" maxLength={40} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={profile?.username} />
          <span className="hint">Pode mudar quando quiser. Seu @{profile?.username} continua o mesmo.</span>
        </label>
        <label className="form-label">
          Bio
          <textarea className="field" name="bio" maxLength={300} rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Que tipo de jogo você curte?" />
          <span className="hint">{bio.length}/300</span>
        </label>
      </section>

      {/* ---------- Foto de perfil ---------- */}
      <section className="card stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: 17 }}>Foto de perfil</h2>
        <div className="row">
          <button type="button" className="btn" onClick={() => avatarFile.current?.click()}>Enviar foto</button>
          <input ref={avatarFile} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => pickFile(e, 'avatar')} tabIndex={-1} />
          <button type="button" className="btn" onClick={() => setAvatar({ mode: 'initial', url: '' })}>Usar inicial e cor</button>
          <span className="muted small">Você escolhe a parte da foto que aparece.</span>
        </div>
        {(avatar.mode === 'initial' || !avatar.url) && (
          <div className="row" role="radiogroup" aria-label="Cor do avatar">
            {AVATAR_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={`Cor ${c}`} onClick={() => setColor(c)}
                className="swatch" style={{ background: c, border: 0, cursor: 'pointer', outline: color === c ? '3px solid var(--accent-text)' : 'none', outlineOffset: 2 }} />
            ))}
          </div>
        )}
        <div className="stack" style={{ gap: 10 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="small" style={{ fontWeight: 600 }}>Avatar aleatório</span>
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
                  onClick={() => setAvatar({ mode: 'url', url })}>
                  <img src={url} alt="" loading="lazy" style={{ imageRendering: diceStyle === 'pixel-art' ? 'pixelated' : 'auto' }} />
                </button>
              );
            })}
          </div>
          <p className="muted" style={{ fontSize: 12 }}>Avatares gerados pelo DiceBear.</p>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Moldura (recompensa de insígnias)</span>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className={`frame-option ${!frame ? 'on' : ''}`} onClick={() => setFrame('')}>Sem moldura</button>
            {Object.entries(AVATAR_FRAMES).map(([id, f]) => {
              const ok = has(f.requires);
              return (
                <button key={id} type="button" disabled={!ok} className={`frame-option ${frame === id ? 'on' : ''}`} onClick={() => setFrame(id)}>
                  <span className={`frame-dot frame-${id}`} aria-hidden="true" />
                  {f.name}
                  {!ok && <Lock requires={f.requires} />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---------- Capa ---------- */}
      <section className="card stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: 17 }}>Capa do perfil</h2>
        <div className="row">
          <button type="button" className="btn" onClick={() => bannerFile.current?.click()}>Enviar imagem</button>
          <input ref={bannerFile} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(e) => pickFile(e, 'banner')} tabIndex={-1} />
          <button type="button" className="btn" onClick={() => setBanner({ mode: 'none', value: '' })}>Sem capa</button>
          <span className="muted small">Você escolhe a parte da imagem que aparece.</span>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Cores prontas</span>
          <div className="banner-grid">
            {Object.keys(BANNER_PRESETS).map((id) => {
              const on = banner.mode === 'preset' && banner.value === `preset:${id}`;
              return (
                <button key={id} type="button" className={`banner-option ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`Capa ${id}`}
                  style={{ background: BANNER_PRESETS[id] }} onClick={() => setBanner({ mode: 'preset', value: `preset:${id}` })} />
              );
            })}
          </div>
        </div>
        <div className="stack" style={{ gap: 8 }}>
          <span className="small" style={{ fontWeight: 600 }}>Arte dos seus jogos</span>
          {artworks.length === 0 ? (
            <p className="muted small">Escolha seus favoritos abaixo ou marque jogos no site, e as artes deles aparecem aqui.</p>
          ) : (
            <div className="banner-grid">
              {artworks.map((a) => {
                const on = banner.mode === 'artwork' && banner.value === a.url;
                return (
                  <button key={a.url} type="button" className={`banner-option ${on ? 'on' : ''}`} aria-pressed={on} aria-label={`Arte de ${a.name}`} title={a.name}
                    style={{ backgroundImage: `url("${a.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    onClick={() => setBanner({ mode: 'artwork', value: a.url })} />
                );
              })}
            </div>
          )}
        </div>
        {bannerValue && !bannerValue.startsWith('preset:') && (
          <label className="row small" style={{ gap: 10, flexWrap: 'nowrap' }}>
            Posição vertical
            <input type="range" min={0} max={100} value={bannerPos} onChange={(e) => setBannerPos(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
          </label>
        )}
      </section>

      {/* ---------- Tema ---------- */}
      <section className="card stack" style={{ gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 17 }}>Cores do perfil</h2>
          <p className="muted small">Muda a cor de destaque e o fundo da sua página para quem visitar.</p>
        </div>
        <div className="theme-grid">
          {Object.entries(PROFILE_THEMES).map(([id, t]) => {
            const ok = has(t.requires);
            return (
              <button key={id} type="button" disabled={!ok} aria-pressed={theme === id} className={`theme-option ${theme === id ? 'on' : ''}`} onClick={() => setTheme(id)}>
                <span className="theme-swatch" style={{ background: `radial-gradient(circle at 50% 0, ${t.glow.replace(/[\d.]+\)$/, '0.9)')}, transparent 70%), var(--field)` }}>
                  <span style={{ background: t.accent }} />
                </span>
                <span>{t.name}</span>
                {!ok && <Lock requires={t.requires} />}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- Favoritos ---------- */}
      <section className="card stack" style={{ gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 17 }}>Seus 3 favoritos</h2>
          <p className="muted small">Ficam em destaque no topo do seu perfil. Clique num espaço e busque o jogo. Não precisa ter avaliado.</p>
        </div>
        <TopGamePicker top={top} setTop={setTop} />
      </section>

      {/* ---------- Trilha sonora ---------- */}
      <section className="card stack" style={{ gap: 12 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 17 }}>Trilha sonora do perfil</h2>
          {!canSoundtrack && <Lock requires="platinador" />}
        </div>
        {!canSoundtrack ? (
          <p className="muted small">Platine um jogo (verificado pela Steam) para colocar a trilha sonora oficial dele no seu perfil.</p>
        ) : (
          <>
            <label className="form-label">
              Jogo platinado
              <select className="field" value={soundGame} onChange={(e) => setSoundGame(e.target.value)}>
                <option value="">— nenhum —</option>
                {platinumGames.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="form-label">
              Link da trilha no Spotify
              <input className="field" value={soundUrl} onChange={(e) => setSoundUrl(e.target.value.trim())} placeholder="https://open.spotify.com/album/…" />
              <span className="hint">No Spotify: abra o álbum da trilha › “…” › Compartilhar › Copiar link.</span>
            </label>
            {soundUrl && !embed && <p className="error">Esse link não é de um álbum, playlist ou música do Spotify.</p>}
            {embed && soundGame && (
              <iframe title="Prévia da trilha" src={embed} width="100%" height="152" style={{ border: 0, borderRadius: 12 }} loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" />
            )}
          </>
        )}
      </section>

      <div className="row">
        <SubmitButton pendingText="Salvando…">Salvar perfil</SubmitButton>
      </div>
    </form>
  );
}
