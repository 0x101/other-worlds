// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import SolarTimeControls from './SolarTimeControls';
import { DEFAULT_SOLAR_EPOCH } from '../lib/solarTime';

afterEach(cleanup);

describe('Solar System date control', () => {
  it('keeps an invalid draft visible and recovers when the unchanged epoch is reselected', () => {
    const onEpoch = vi.fn();
    render(<SolarTimeControls epoch={DEFAULT_SOLAR_EPOCH} playing={false} reducedMotion={false} onEpoch={onEpoch} onPlayingChange={vi.fn()} />);
    const input = screen.getByLabelText('Choose UTC date');

    fireEvent.change(input, { target: { value: '1999-12-31' } });
    expect(input).toHaveProperty('value', '1999-12-31');
    expect(input).toHaveProperty('ariaInvalid', 'true');
    expect(onEpoch).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '2026-11-26' } });
    expect(onEpoch).toHaveBeenCalledWith(DEFAULT_SOLAR_EPOCH);
    expect(input).toHaveProperty('value', '2026-11-26');
    expect(input).toHaveProperty('ariaInvalid', 'false');
    expect(screen.getByText('Paused · date choices select 00:00 UTC.')).toBeTruthy();
  });
});
