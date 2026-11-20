'use client';
import { useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Recorta a parte escolhida e devolve uma imagem nova (WEBP, ou PNG se o navegador não suportar)
async function cropImage(src, area, outW, outH) {
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/webp', 0.9));
}

export default function ImageCropper({ file, aspect = 1, round = false, outWidth, outHeight, title, onCancel, onDone }) {
  const [src, setSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e?.message || 'Não foi possível enviar a imagem.');
    }
    setBusy(false);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal card stack" style={{ gap: 14 }}>
        <h2 style={{ fontSize: 18 }}>{title}</h2>
        <p className="muted small">Arraste a imagem para escolher a parte que aparece e use a barra para dar zoom.</p>
        <div className="crop-area">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={round ? 'round' : 'rect'}
              showGrid={!round}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          )}
        </div>
        <label className="row small" style={{ gap: 10, flexWrap: 'nowrap' }}>
          Zoom
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>Cancelar</button>
          {file.type === 'image/gif' && (
            <button type="button" className="btn" disabled={busy} title="Mantém a animação do GIF" onClick={() => run(() => onDone(file))}>
              Usar sem recortar
            </button>
          )}
          <button type="button" className="btn btn-accent" disabled={busy || !area}
            onClick={() => run(async () => onDone(await cropImage(src, area, outWidth, outHeight)))}>
            {busy ? 'Enviando…' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
}
