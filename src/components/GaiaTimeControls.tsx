import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import {
  GAIA_MAX_YEAR_OFFSET,
  GAIA_MIN_YEAR_OFFSET,
  GAIA_YEAR_STEP,
  formatGaiaTime,
  shiftGaiaYearOffset,
} from '../lib/gaia';

interface GaiaTimeControlsProps {
  offset: number;
  staticMode: boolean;
  suppressed?: boolean;
  onOffset: (offset: number) => void;
}

export default function GaiaTimeControls({ offset, staticMode, suppressed = false, onOffset }: GaiaTimeControlsProps) {
  return (
    <section className={`gaia-time ${suppressed ? 'gaia-time-suppressed' : ''}`} aria-label="Gaia proper-motion selected-time controls">
      <div className="gaia-time-readout">
        <span>Derived sky · selected time</span>
        <output aria-live="polite">{formatGaiaTime(offset)}</output>
      </div>
      <div className="gaia-time-actions">
        <button className="icon-button" onClick={() => onOffset(shiftGaiaYearOffset(offset, -GAIA_YEAR_STEP))} disabled={offset === GAIA_MIN_YEAR_OFFSET} aria-label="Previous 1,000 years" title="One thousand Julian years earlier"><ChevronLeft size={17} /></button>
        <button className="icon-button" onClick={() => onOffset(shiftGaiaYearOffset(offset))} disabled={offset === GAIA_MAX_YEAR_OFFSET} aria-label="Next 1,000 years" title="One thousand Julian years later"><ChevronRight size={17} /></button>
        <button className="text-button" onClick={() => onOffset(0)} disabled={offset === 0} aria-label="Reset to Gaia J2016.0"><RotateCcw size={14} />Reference epoch</button>
      </div>
      <label className="gaia-time-slider">Years from Gaia J2016.0
        <input
          type="range"
          min={GAIA_MIN_YEAR_OFFSET}
          max={GAIA_MAX_YEAR_OFFSET}
          step="1"
          value={offset}
          aria-valuetext={formatGaiaTime(offset)}
          onChange={(event) => onOffset(Number(event.target.value))}
        />
      </label>
      <div className="gaia-time-bounds" aria-hidden="true"><span>−10,000</span><span>J2016.0</span><span>+10,000</span></div>
      <p role="status">Transverse-motion approximation · not a live sky.{staticMode ? ' Still reconstruction · same derived directions.' : ''}</p>
    </section>
  );
}
