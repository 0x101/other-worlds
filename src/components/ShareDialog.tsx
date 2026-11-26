import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Orbit, ScrollText, X } from 'lucide-react';
import type { JourneyState, PlanetRow, Provenance, ShareTemplate } from '../types';
import { createShareImage, exactShareUrl, SHARE_TEMPLATE_SPECS, shareFilename } from '../lib/share';
import { useDialogFocus } from '../lib/useDialogFocus';

interface ShareDialogProps {
  planet: PlanetRow;
  siblings: PlanetRow[];
  journey: JourneyState;
  provenance: Provenance;
  template: ShareTemplate;
  onTemplateChange: (template: ShareTemplate) => void;
  onClose: () => void;
}

const TEMPLATE_ICONS = { portrait: ImageIcon, 'field-note': ScrollText, 'orbital-study': Orbit } as const;

export default function ShareDialog({ planet, siblings, journey, provenance, template, onTemplateChange, onClose }: ShareDialogProps) {
  const dialogRef = useDialogFocus<HTMLElement>(onClose);
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Composing the finished PNG…');
  const [copied, setCopied] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const reopenUrl = useMemo(() => exactShareUrl(journey, template, window.location.href), [journey, template]);

  useEffect(() => {
    let cancelled = false;
    let objectUrl = '';
    setBusy(true);
    setError('');
    setCopied(false);
    setPreview(null);
    setStatus(`Composing ${SHARE_TEMPLATE_SPECS[template].label}…`);
    createShareImage({ planet, siblings, journey, provenance, template, reopenUrl }).then((blob) => {
      if (cancelled) return;
      objectUrl = URL.createObjectURL(blob);
      setPreview({ url: objectUrl, blob });
      setStatus(`${SHARE_TEMPLATE_SPECS[template].label} is ready to copy or download.`);
    }).catch((reason: unknown) => {
      if (cancelled) return;
      setError(reason instanceof Error ? reason.message : 'The PNG could not be composed.');
      setStatus('Export interrupted. Your world and camera are unchanged.');
    }).finally(() => { if (!cancelled) setBusy(false); });
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [planet, siblings, journey, provenance, template, reopenUrl, attempt]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(reopenUrl);
      setCopied(true);
      setStatus('Exact reopen link copied. It restores this world, camera, and template.');
    } catch {
      inputRef.current?.focus();
      inputRef.current?.select();
      setCopied(false);
      setStatus('Clipboard access was blocked. The exact link is selected; press Ctrl+C or ⌘C.');
    }
  }

  function download() {
    if (!preview || busy) return;
    const anchor = document.createElement('a');
    anchor.href = preview.url;
    anchor.download = shareFilename(planet, template);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setStatus(`${shareFilename(planet, template)} downloaded at ${SHARE_TEMPLATE_SPECS[template].width} × ${SHARE_TEMPLATE_SPECS[template].height} pixels.`);
  }

  return (
    <div className="share-layer">
      <button className="share-backdrop" aria-label="Close Share" onClick={onClose} />
      <section className="share-dialog" role="dialog" aria-modal="true" aria-labelledby="share-title" ref={dialogRef}>
        <header className="share-header">
          <div><span className="section-label">A portrait with provenance</span><h2 id="share-title">Share this world.</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="Close Share"><X size={19} /></button>
        </header>
        <div className="share-body">
          <div className="share-preview" data-template={template}>
            {preview && <img src={preview.url} alt={`${SHARE_TEMPLATE_SPECS[template].label} share image for ${planet.pl_name}`} />}
            {busy && <div className="share-preview-state" role="status"><Orbit size={28} /><span>Composing the finished artwork…</span></div>}
            {!busy && error && <div className="share-preview-state share-error" role="alert"><strong>PNG composition was interrupted.</strong><span>{error}</span><button className="text-button" onClick={() => setAttempt((value) => value + 1)}>Try this template again</button></div>}
          </div>
          <div className="share-controls">
            <div className="share-template-picker" role="group" aria-label="Finished share template">
              {(Object.keys(SHARE_TEMPLATE_SPECS) as ShareTemplate[]).map((name) => {
                const spec = SHARE_TEMPLATE_SPECS[name];
                const Icon = TEMPLATE_ICONS[name];
                return <button key={name} className={template === name ? 'active' : ''} aria-pressed={template === name} onClick={() => onTemplateChange(name)}><Icon size={18} strokeWidth={1.4} /><span><strong>{spec.label}</strong><small>{spec.description}</small></span></button>;
              })}
            </div>
            <p className="share-fixed-note">Art-directed and ready as shown. Measurements stay unchanged; unknowns stay out of the picture.</p>
            <label className="share-link-label" htmlFor="share-exact-link">Exact reopen link</label>
            <div className="share-link-row"><input ref={inputRef} id="share-exact-link" readOnly value={reopenUrl} onFocus={(event) => event.target.select()} /><button className="icon-button" onClick={copyLink} aria-label="Copy exact link">{copied ? <Check size={18} /> : <Copy size={18} />}</button></div>
            <div className="share-actions">
              <button className="secondary-button" onClick={copyLink}><Copy size={16} />Copy exact link</button>
              <button className="primary-button" disabled={busy || !preview} onClick={download}><Download size={17} />Download PNG</button>
            </div>
            <p className="share-status" role="status">{status}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
