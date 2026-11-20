'use client';
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Avatar from './Avatar';
import { ChatIcon, ImageIcon } from './Icons';
import { getBrowserClient } from '@/lib/supabase/client';
import { timeAgo } from '@/lib/format';

const PROFILE = 'id, username, display_name, avatar_color, avatar_url';
const MSG = 'id, sender_id, recipient_id, body, kind, media_url, media_path, media_name, created_at, read_at';
const MAX_FILE = 25 * 1024 * 1024;
const STICKERS_PREFIX = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/stickers/`;

function safeMedia(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'giphy.com' || u.hostname.endsWith('.giphy.com') || url.startsWith(STICKERS_PREFIX));
  } catch {
    return false;
  }
}

function preview(m) {
  if (m.body) return m.body;
  return { image: '📷 Foto', video: '🎬 Vídeo', file: '📎 Arquivo', gif: 'GIF', sticker: 'Figurinha' }[m.kind] || 'Mensagem';
}

// ---------------------------------------------------------------------
// Painel de figurinhas: GIFs e figurinhas do GIPHY + as suas
// ---------------------------------------------------------------------
function StickerPanel({ me, onPick }) {
  const supabase = getBrowserClient();
  const [tab, setTab] = useState('stickers');
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [enabled, setEnabled] = useState(true);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  const loadMine = useCallback(async () => {
    const { data } = await supabase.from('stickers').select('id, url').eq('user_id', me.id).order('created_at', { ascending: false }).limit(60);
    setMine(data || []);
  }, [supabase, me.id]);

  useEffect(() => {
    if (tab === 'minhas') {
      loadMine();
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/giphy?type=${tab}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await res.json();
        setEnabled(data.enabled !== false);
        setItems(data.items || []);
      } catch {}
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [tab, q, loadMine]);

  async function addOwn(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!['image/png', 'image/webp', 'image/gif', 'image/jpeg'].includes(f.type)) return setErr('Use PNG, WEBP, GIF ou JPG.');
    if (f.size > 1024 * 1024) return setErr('A figurinha pode ter no máximo 1 MB.');
    setBusy(true);
    setErr('');
    const ext = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/jpeg': 'jpg' }[f.type];
    const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from('stickers').upload(path, f, { contentType: f.type });
    if (error) {
      setErr('Não foi possível enviar a figurinha.');
    } else {
      const url = supabase.storage.from('stickers').getPublicUrl(path).data.publicUrl;
      await supabase.from('stickers').insert({ user_id: me.id, url });
      await loadMine();
    }
    setBusy(false);
  }

  async function removeOwn(id) {
    await supabase.from('stickers').delete().eq('id', id);
    setMine((m) => m.filter((s) => s.id !== id));
  }

  return (
    <div className="sticker-panel">
      <div className="row" style={{ gap: 6 }}>
        {[['stickers', 'Figurinhas'], ['gifs', 'GIFs'], ['minhas', 'Minhas']].map(([id, label]) => (
          <button key={id} type="button" className={`pill ${tab === id ? 'on' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      {tab !== 'minhas' ? (
        <>
          <input className="field" value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'gifs' ? 'Buscar GIFs…' : 'Buscar figurinhas…'} style={{ padding: '8px 12px' }} />
          {!enabled ? (
            <p className="muted small">O GIPHY ainda não foi configurado no site (falta a GIPHY_API_KEY). Use a aba “Minhas”.</p>
          ) : (
            <div className="sticker-grid">
              {items.map((it) => (
                <button key={it.id} type="button" className="sticker-item" onClick={() => onPick(tab === 'gifs' ? 'gif' : 'sticker', it.url)} aria-label="Enviar">
                  <img src={it.preview} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
          <p className="muted" style={{ fontSize: 11 }}>Powered by GIPHY</p>
        </>
      ) : (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <button type="button" className="pill" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? 'Enviando…' : '+ Criar figurinha'}</button>
            <input ref={fileRef} type="file" accept="image/png,image/webp,image/gif,image/jpeg" className="sr-only" onChange={addOwn} tabIndex={-1} />
            <span className="muted" style={{ fontSize: 11 }}>Use o ☆ nas figurinhas do chat para salvar aqui</span>
          </div>
          {err && <p className="error small">{err}</p>}
          {mine.length === 0 ? (
            <p className="muted small">Você ainda não tem figurinhas. Crie uma a partir de uma imagem ou salve as que receber no chat (botão ☆).</p>
          ) : (
            <div className="sticker-grid">
              {mine.map((s) => (
                <span key={s.id} style={{ position: 'relative' }}>
                  <button type="button" className="sticker-item" onClick={() => onPick('sticker', s.url)} aria-label="Enviar figurinha">
                    <img src={s.url} alt="" loading="lazy" />
                  </button>
                  <button type="button" className="sticker-remove" onClick={() => removeOwn(s.id)} aria-label="Apagar figurinha">×</button>
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Uma mensagem
// ---------------------------------------------------------------------
function Message({ m, mine, signed, onSaveSticker }) {
  const url = m.media_path ? signed[m.media_path] : m.media_url;
  const isSticker = (m.kind === 'gif' || m.kind === 'sticker') && m.media_url && safeMedia(m.media_url);
  if (isSticker) {
    return (
      <div className={`chat-row ${mine ? 'mine' : ''}`}>
        <div className="sticker-msg">
          <img src={m.media_url} alt={m.kind === 'gif' ? 'GIF' : 'Figurinha'} loading="lazy" />
          <span className="row" style={{ gap: 6, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
            <span className="bubble-time">{timeAgo(m.created_at)}</span>
            <button type="button" className="save-sticker" onClick={() => onSaveSticker(m.media_url)} title="Salvar nas minhas figurinhas" aria-label="Salvar nas minhas figurinhas">☆</button>
          </span>
        </div>
      </div>
    );
  }
  return (
    <div className={`chat-row ${mine ? 'mine' : ''}`}>
      <div className={`bubble ${mine ? 'mine' : ''}`}>
        {m.kind === 'image' && (url ? <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={m.media_name || 'Imagem'} className="chat-media" /></a> : <span className="muted small">Carregando imagem…</span>)}
        {m.kind === 'video' && (url ? <video src={url} controls preload="metadata" className="chat-media" /> : <span className="muted small">Carregando vídeo…</span>)}
        {m.kind === 'file' && (url ? <a href={url} target="_blank" rel="noopener noreferrer" download={m.media_name || true} style={{ color: 'inherit', textDecoration: 'underline' }}>📎 {m.media_name || 'Arquivo'}</a> : <span className="muted small">Carregando arquivo…</span>)}
        {(m.kind === 'gif' || m.kind === 'sticker') && !isSticker && m.media_url && <a href={m.media_url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{m.media_url}</a>}
        {m.body && <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{m.body}</p>}
        <span className="bubble-time">{timeAgo(m.created_at)}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// O pop-up de chat
// ---------------------------------------------------------------------
export default function ChatDock({ me }) {
  const supabase = getBrowserClient();
  const [open, setOpen] = useState(false);
  const [friends, setFriends] = useState([]);
  const [convos, setConvos] = useState({});
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState([]);
  const [signed, setSigned] = useState({});
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showStickers, setShowStickers] = useState(false);
  const [toast, setToast] = useState('');
  const fileRef = useRef(null);
  const activeRef = useRef(null);
  const openRef = useRef(false);
  const friendsRef = useRef([]);
  activeRef.current = active;
  openRef.current = open;
  friendsRef.current = friends;

  const unread = Object.values(convos).reduce((s, c) => s + (c?.unread || 0), 0);

  const signMedia = useCallback(async (list) => {
    const paths = [...new Set(list.filter((m) => m.media_path).map((m) => m.media_path))];
    if (!paths.length) return;
    const { data } = await supabase.storage.from('chat-media').createSignedUrls(paths, 60 * 60);
    const map = {};
    for (const d of data || []) if (d.signedUrl && d.path) map[d.path] = d.signedUrl;
    setSigned((s) => ({ ...s, ...map }));
  }, [supabase]);

  const loadOverview = useCallback(async () => {
    const [{ data: fing }, { data: fers }, { data: msgs }] = await Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', me.id),
      supabase.from('follows').select('follower_id').eq('following_id', me.id),
      supabase.from('messages').select(MSG).or(`sender_id.eq.${me.id},recipient_id.eq.${me.id}`).order('created_at', { ascending: false }).limit(300),
    ]);
    const followers = new Set((fers || []).map((f) => f.follower_id));
    const ids = (fing || []).map((f) => f.following_id).filter((id) => followers.has(id));
    const { data: people } = ids.length ? await supabase.from('profiles').select(PROFILE).in('id', ids) : { data: [] };
    const c = {};
    for (const m of msgs || []) {
      const other = m.sender_id === me.id ? m.recipient_id : m.sender_id;
      if (!c[other]) c[other] = { last: m, unread: 0 };
      if (m.recipient_id === me.id && !m.read_at) c[other].unread += 1;
    }
    // Se a conversa estiver aberta, ela não conta como não lida
    if (openRef.current && activeRef.current && c[activeRef.current.id]) c[activeRef.current.id].unread = 0;
    setFriends(people || []);
    setConvos(c);
  }, [supabase, me.id]);

  const openThread = useCallback(async (person) => {
    setActive(person);
    setShowStickers(false);
    setError('');
    setLoading(true);
    const { data } = await supabase.from('messages').select(MSG)
      .or(`and(sender_id.eq.${me.id},recipient_id.eq.${person.id}),and(sender_id.eq.${person.id},recipient_id.eq.${me.id})`)
      .order('created_at', { ascending: false }).limit(100);
    const list = (data || []).reverse();
    setThread(list);
    setLoading(false);
    signMedia(list);
    setConvos((c) => (c[person.id] ? { ...c, [person.id]: { ...c[person.id], unread: 0 } } : c));
    await supabase.rpc('mark_read', { other: person.id });
  }, [supabase, me.id, signMedia]);

  // Mensagem nova chegando em tempo real
  const onIncoming = useCallback((m) => {
    const other = m.sender_id;
    const isOpenThread = openRef.current && activeRef.current?.id === other;
    if (isOpenThread) {
      setThread((t) => (t.some((x) => x.id === m.id) ? t : [...t, m]));
      signMedia([m]);
      supabase.rpc('mark_read', { other });
    }
    setConvos((c) => ({ ...c, [other]: { last: m, unread: isOpenThread ? 0 : (c[other]?.unread || 0) + 1 } }));
    if (!friendsRef.current.some((f) => f.id === other)) loadOverview();
    if (!isOpenThread) {
      const who = friendsRef.current.find((f) => f.id === other);
      setToast(`${who?.display_name || who?.username || 'Alguém'}: ${preview(m)}`);
      setTimeout(() => setToast(''), 4000);
    }
  }, [supabase, signMedia, loadOverview]);

  useEffect(() => {
    loadOverview();
    let channel = null;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`dm-${me.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me.id}` }, (payload) => onIncoming(payload.new))
        .subscribe();
    })();
    // Reserva: confere a cada 30 s caso o tempo real caia
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') loadOverview();
    }, 30000);
    return () => {
      cancelled = true;
      clearInterval(poll);
      if (channel) supabase.removeChannel(channel);
    };
  }, [supabase, me.id, loadOverview, onIncoming]);

  // Botão "Mensagem" no perfil abre o pop-up direto na conversa
  useEffect(() => {
    async function handler(e) {
      const username = e.detail?.username;
      setOpen(true);
      if (!username) return;
      let person = friendsRef.current.find((f) => f.username === username);
      if (!person) {
        const { data } = await supabase.from('profiles').select(PROFILE).eq('username', username).maybeSingle();
        person = data;
      }
      if (person) openThread(person);
    }
    window.addEventListener('savepoint:chat', handler);
    return () => window.removeEventListener('savepoint:chat', handler);
  }, [supabase, openThread]);

  async function send(payload) {
    if (!active) return false;
    setSending(true);
    setError('');
    const row = { sender_id: me.id, recipient_id: active.id, body: '', kind: 'text', ...payload };
    const { data, error: err } = await supabase.from('messages').insert(row).select(MSG).single();
    setSending(false);
    if (err) {
      setError('Não foi possível enviar. Vocês precisam se seguir mutuamente.');
      return false;
    }
    setThread((t) => [...t, data]);
    setConvos((c) => ({ ...c, [active.id]: { last: data, unread: 0 } }));
    if (data.media_path) signMedia([data]);
    return true;
  }

  async function sendText(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    if (await send({ body: body.slice(0, 2000) })) setText('');
  }

  async function sendFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !active) return;
    if (file.size > MAX_FILE) return setError('O arquivo pode ter no máximo 25 MB.');
    const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'bin';
    const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    setSending(true);
    setError('');
    const { error: upErr } = await supabase.storage.from('chat-media').upload(path, file, { contentType: file.type || 'application/octet-stream' });
    setSending(false);
    if (upErr) return setError('Não foi possível enviar esse arquivo. Formatos aceitos: imagens, vídeos (MP4/WEBM/MOV), áudio, PDF, ZIP e TXT.');
    await send({ kind, media_path: path, media_name: file.name.slice(0, 120), body: text.trim().slice(0, 2000) });
    setText('');
  }

  async function saveSticker(url) {
    const { error: err } = await supabase.from('stickers').upsert({ user_id: me.id, url }, { onConflict: 'user_id,url', ignoreDuplicates: true });
    setToast(err ? 'Não foi possível salvar a figurinha.' : 'Figurinha salva em “Minhas”!');
    setTimeout(() => setToast(''), 2500);
  }

  const sorted = [...friends].sort((a, b) => (convos[b.id]?.last.created_at || '').localeCompare(convos[a.id]?.last.created_at || ''));

  return (
    <>
      {toast && !open && <div className="chat-toast" role="status" onClick={() => setOpen(true)}>{toast}</div>}
      {open && (
        <section className="chat-panel" aria-label="Mensagens">
          <header className="chat-head">
            {active ? (
              <>
                <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => { setActive(null); setShowStickers(false); }} aria-label="Voltar para as conversas">←</button>
                <Link href={`/u/${active.username}`} className="row" style={{ gap: 8, flex: 1, minWidth: 0, flexWrap: 'nowrap' }}>
                  <Avatar profile={active} size={30} frame={null} />
                  <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active.display_name || active.username}</strong>
                </Link>
              </>
            ) : (
              <strong style={{ flex: 1 }}>Mensagens</strong>
            )}
            <button type="button" className="icon-btn" style={{ width: 34, height: 34 }} onClick={() => setOpen(false)} aria-label="Fechar mensagens">×</button>
          </header>

          {!active ? (
            <div className="chat-list">
              {sorted.length === 0 ? (
                <p className="muted small" style={{ padding: 16 }}>
                  Você pode conversar com quem segue você e é seguido por você. <Link href="/pessoas" style={{ color: 'var(--accent-text)' }}>Encontrar pessoas</Link>
                </p>
              ) : (
                sorted.map((p) => {
                  const c = convos[p.id];
                  return (
                    <button key={p.id} type="button" className="chat-list-item" onClick={() => openThread(p)}>
                      <Avatar profile={p} size={40} frame={null} />
                      <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0, textAlign: 'left' }}>
                        <span style={{ fontWeight: 600 }}>{p.display_name || p.username}</span>
                        <span className="muted small" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: c?.unread ? 700 : 400, color: c?.unread ? 'var(--text)' : undefined }}>
                          {c ? `${c.last.sender_id === me.id ? 'Você: ' : ''}${preview(c.last)}` : 'Comece uma conversa'}
                        </span>
                      </span>
                      <span className="stack" style={{ alignItems: 'flex-end', gap: 4 }}>
                        {c && <span className="muted" style={{ fontSize: 11 }}>{timeAgo(c.last.created_at)}</span>}
                        {c?.unread ? <span className="count-badge">{c.unread}</span> : null}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            <>
              <div className="chat-thread" aria-live="polite">
                {/* column-reverse: começa rolado na última mensagem */}
                {loading && <p className="muted small" style={{ margin: 'auto' }}>Carregando…</p>}
                {!loading && thread.length === 0 && <p className="muted small" style={{ margin: 'auto', textAlign: 'center' }}>Diga oi! 👋</p>}
                {[...thread].reverse().map((m) => (
                  <Message key={m.id} m={m} mine={m.sender_id === me.id} signed={signed} onSaveSticker={saveSticker} />
                ))}
              </div>
              {showStickers && <StickerPanel me={me} onPick={async (kind, url) => { if (await send({ kind, media_url: url })) setShowStickers(false); }} />}
              {error && <p className="error small" style={{ padding: '0 12px' }} role="alert">{error}</p>}
              <form className="chat-compose" onSubmit={sendText}>
                <button type="button" className="icon-btn" onClick={() => fileRef.current?.click()} aria-label="Enviar imagem, vídeo ou arquivo" title="Imagem, vídeo ou arquivo" disabled={sending}>
                  <ImageIcon />
                </button>
                <input ref={fileRef} type="file" className="sr-only" onChange={sendFile} tabIndex={-1}
                  accept="image/*,video/mp4,video/webm,video/quicktime,audio/*,.pdf,.zip,.txt" />
                <button type="button" className={`icon-btn ${showStickers ? 'on' : ''}`} onClick={() => setShowStickers((s) => !s)} aria-label="Figurinhas e GIFs" title="Figurinhas e GIFs">
                  <span aria-hidden="true" style={{ fontSize: 18 }}>☺</span>
                </button>
                <label className="sr-only" htmlFor="chat-text">Mensagem</label>
                <textarea id="chat-text" className="field" rows={1} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem…"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) sendText(e); }} />
                <button type="submit" className="btn btn-accent" disabled={sending || !text.trim()} style={{ minHeight: 40, padding: '8px 14px' }}>
                  {sending ? '…' : 'Enviar'}
                </button>
              </form>
            </>
          )}
        </section>
      )}
      <button type="button" className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Fechar mensagens' : `Abrir mensagens${unread ? ` (${unread} não lidas)` : ''}`}>
        <ChatIcon />
        {unread > 0 && <span className="count-badge chat-fab-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>
    </>
  );
}
