// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import GaiaTimeControls from './GaiaTimeControls';

const controls = (offset = 0, staticMode = false) => ({ offset, staticMode, onOffset: vi.fn() });

afterEach(cleanup);

describe('Gaia selected-time controls', () => {
  it('steps and resets a bounded TCB Julian-year offset without playback', () => {
    const props = controls();
    const { rerender } = render(<GaiaTimeControls {...props} />);
    expect(screen.getByText('J2016.0 · reference epoch · TCB')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reset to Gaia J2016.0' })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('button', { name: /play/i })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Next 1,000 years' }));
    expect(props.onOffset).toHaveBeenCalledWith(1000);
    rerender(<GaiaTimeControls {...props} offset={1000} />);
    expect(screen.getByText('J2016.0 + 1,000 Julian years · TCB')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Previous 1,000 years' }));
    expect(props.onOffset).toHaveBeenLastCalledWith(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reset to Gaia J2016.0' }));
    expect(props.onOffset).toHaveBeenLastCalledWith(0);
  });

  it('supports direct slider input, static rendering, and disabled bounds', () => {
    const props = controls(0, true);
    const { rerender } = render(<GaiaTimeControls {...props} />);
    expect(screen.getByText(/Still reconstruction · same derived directions/)).toBeTruthy();
    fireEvent.change(screen.getByRole('slider', { name: 'Years from Gaia J2016.0' }), { target: { value: '-2500' } });
    expect(props.onOffset).toHaveBeenCalledWith(-2500);

    rerender(<GaiaTimeControls {...props} offset={-10000} />);
    expect(screen.getByRole('button', { name: 'Previous 1,000 years' })).toHaveProperty('disabled', true);
    rerender(<GaiaTimeControls {...props} offset={10000} />);
    expect(screen.getByRole('button', { name: 'Next 1,000 years' })).toHaveProperty('disabled', true);
  });
});
