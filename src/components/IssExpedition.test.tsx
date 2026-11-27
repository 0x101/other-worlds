// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import IssExpedition from './IssExpedition';
import { DEFAULT_ISS_EPOCH, shiftIssEpoch } from '../lib/iss';

afterEach(cleanup);

describe('ISS expedition controls', () => {
  it('steps explicit time, resets only after a change, and closes without live playback', () => {
    const onEpoch = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(<IssExpedition epoch={DEFAULT_ISS_EPOCH} staticMode={false} onEpoch={onEpoch} onClose={onClose} />);
    expect(screen.getByRole('button', { name: 'Reset to ISS source epoch' })).toHaveProperty('disabled', true);
    expect(screen.getByText(/At OMM source epoch · SGP4-derived, not live\./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next 10 minutes' }));
    expect(onEpoch).toHaveBeenCalledWith(shiftIssEpoch(DEFAULT_ISS_EPOCH));
    rerender(<IssExpedition epoch={shiftIssEpoch(DEFAULT_ISS_EPOCH)} staticMode={false} onEpoch={onEpoch} onClose={onClose} />);
    expect(screen.getByText(/\+10\.0 min from OMM epoch/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous 10 minutes' }));
    expect(onEpoch).toHaveBeenLastCalledWith(DEFAULT_ISS_EPOCH);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to ISS source epoch' }));
    expect(onEpoch).toHaveBeenLastCalledWith(DEFAULT_ISS_EPOCH);
    fireEvent.click(screen.getByRole('button', { name: 'Close ISS expedition' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('retains honest static-mode and source-staleness explanations', () => {
    render(<IssExpedition epoch={DEFAULT_ISS_EPOCH} staticMode onEpoch={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Still reconstruction\./)).toBeTruthy();
    fireEvent.click(screen.getByText('Orbit, staleness & scale'));
    expect(screen.getByText('2026-11-27T09:29:25.185696Z')).toBeTruthy();
    expect(screen.getByText(/9 h 52 min old when preserved/)).toBeTruthy();
    expect(screen.getByText(/not an accuracy guarantee/)).toBeTruthy();
  });
});
