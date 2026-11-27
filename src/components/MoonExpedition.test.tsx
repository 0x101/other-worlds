// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import MoonExpedition from './MoonExpedition';
import { DEFAULT_MOON_EPOCH, shiftMoonEpoch } from '../lib/moon';

afterEach(cleanup);

describe('Moon expedition controls', () => {
  it('steps explicit time, resets only after a change, and closes without live playback', () => {
    const onEpoch = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<MoonExpedition epoch={DEFAULT_MOON_EPOCH} staticMode={false} onEpoch={onEpoch} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Reset to Moon reference epoch' })).toHaveProperty('disabled', true);
    expect(screen.getByText(/At reference epoch · GeoMoon-derived, not live\./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next 3 hours' }));
    expect(onEpoch).toHaveBeenCalledWith(shiftMoonEpoch(DEFAULT_MOON_EPOCH));
    rerender(<MoonExpedition epoch={shiftMoonEpoch(DEFAULT_MOON_EPOCH)} staticMode={false} onEpoch={onEpoch} onClose={onClose} />);
    expect(screen.getByText(/\+3\.0 h from reference/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous 3 hours' }));
    expect(onEpoch).toHaveBeenLastCalledWith(DEFAULT_MOON_EPOCH);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Moon reference epoch' }));
    expect(onEpoch).toHaveBeenLastCalledWith(DEFAULT_MOON_EPOCH);
    fireEvent.click(screen.getByRole('button', { name: 'Close Moon expedition' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('retains honest static, time-scale, display, and uncertainty explanations', () => {
    render(<MoonExpedition epoch={DEFAULT_MOON_EPOCH} staticMode onEpoch={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Still reconstruction\./)).toBeTruthy();
    fireEvent.click(screen.getByText('Ephemeris, time & scale'));
    expect(screen.getByText('2026-12-18T00:00:00.000Z')).toBeTruthy();
    expect(screen.getByText(/UT1 ≈ UTC/)).toBeTruthy();
    expect(screen.getByText(/not an accuracy guarantee/)).toBeTruthy();
    expect(screen.getByText(/not an observed surface portrait or calculated phase/)).toBeTruthy();
  });
});
