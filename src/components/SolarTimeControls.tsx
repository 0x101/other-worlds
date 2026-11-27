import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { DEFAULT_SOLAR_EPOCH, SOLAR_MAX_EPOCH, SOLAR_MIN_EPOCH, formatSolarEpoch, shiftSolarEpoch, solarEpochFromDate } from '../lib/solarTime';

interface SolarTimeControlsProps {
  epoch: string;
  playing: boolean;
  reducedMotion: boolean;
  onEpoch: (epoch: string) => void;
  onPlayingChange: (playing: boolean) => void;
}

export default function SolarTimeControls({ epoch, playing, reducedMotion, onEpoch, onPlayingChange }: SolarTimeControlsProps) {
  const [dateDraft, setDateDraft] = useState(() => epoch.slice(0, 10));
  const [dateError, setDateError] = useState(false);
  const atStart = epoch === SOLAR_MIN_EPOCH;
  const atEnd = epoch === SOLAR_MAX_EPOCH;

  useEffect(() => {
    setDateDraft(epoch.slice(0, 10));
    setDateError(false);
  }, [epoch]);

  const selectEpoch = (next: string) => {
    setDateDraft(next.slice(0, 10));
    setDateError(false);
    onEpoch(next);
  };

  const selectDate = (date: string) => {
    setDateDraft(date);
    if (!date) {
      setDateError(false);
      return;
    }
    try {
      selectEpoch(solarEpochFromDate(date));
    } catch {
      setDateError(true);
    }
  };

  return (
    <div className="solar-time" role="group" aria-label="Solar System model time controls">
      <div className="solar-time-readout">
        <span>Selected epoch · UTC</span>
        <time dateTime={epoch}>{formatSolarEpoch(epoch)}</time>
      </div>
      <div className="solar-time-actions">
        <button className="icon-button" onClick={() => selectEpoch(shiftSolarEpoch(epoch, -1))} disabled={atStart} aria-label="Previous day" title="Previous UTC day"><ChevronLeft size={17} /></button>
        {!reducedMotion && (
          <button className="solar-play" onClick={() => { setDateError(false); onPlayingChange(!playing); }} disabled={!playing && atEnd} aria-pressed={playing} aria-label={playing ? 'Pause model time' : 'Play model time'}>
            {playing ? <Pause size={15} /> : <Play size={15} />}
            <span>{playing ? 'Pause' : 'Play'}</span><small>1 day / s</small>
          </button>
        )}
        <button className="icon-button" onClick={() => selectEpoch(shiftSolarEpoch(epoch, 1))} disabled={atEnd} aria-label="Next day" title="Next UTC day"><ChevronRight size={17} /></button>
        <button className="icon-button" onClick={() => selectEpoch(DEFAULT_SOLAR_EPOCH)} disabled={epoch === DEFAULT_SOLAR_EPOCH} aria-label="Reset to reference epoch" title="Reset to 26 November 2026, 00:00 UTC"><RotateCcw size={15} /></button>
      </div>
      <label className="solar-date">Choose UTC date
        <input type="date" min={SOLAR_MIN_EPOCH.slice(0, 10)} max={SOLAR_MAX_EPOCH.slice(0, 10)} value={dateDraft} aria-invalid={dateError} aria-describedby="solar-time-status" onChange={(event) => selectDate(event.target.value)} />
      </label>
      <p className="solar-time-status" id="solar-time-status" role="status">{dateError ? 'Use 2000-01-01 through 2100-01-01 UTC · epoch unchanged.' : reducedMotion ? 'Reduced motion · use explicit date steps.' : playing ? 'Model time playing · not a live clock.' : 'Paused · date choices select 00:00 UTC.'}</p>
    </div>
  );
}
