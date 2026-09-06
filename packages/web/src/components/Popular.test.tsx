import { render, screen } from '@testing-library/react';
import { PALETTE_FIELDS, type Palette } from '@vscodethemes/shared';
import { Popular } from './Popular.tsx';
import type { PopularMatch } from '../workers/protocol.ts';

const palette = Object.fromEntries(
  PALETTE_FIELDS.map((f) => [f, null]),
) as Palette;

const popular: PopularMatch = {
  theme: {
    id: 'dracula-theme.theme-dracula/Dracula',
    displayName: 'Dracula',
    extensionDisplayName: 'Dracula Official',
    preview:
      'https://images.vscodethemes.com/dracula-theme.theme-dracula/Dracula-js-preview-AAAA.svg',
    rank: 12,
    paletteClass: 3,
    palette,
  },
  distance: 1.42,
  apart: 0.81,
  considered: 37,
};

describe('Popular', () => {
  it('names the theme and the extension it ships in', () => {
    render(<Popular popular={popular} topName="Nord Deep" />);
    const text = screen.getByTestId('popular').textContent ?? '';
    expect(text).toContain('Dracula');
    expect(text).toContain('Dracula Official');
  });

  it('says how many themes it was picked from and how close they had to be', () => {
    render(<Popular popular={popular} topName="Nord Deep" />);
    const text = screen.getByTestId('popular').textContent ?? '';
    expect(text).toContain('37 themes');
    expect(text).toContain('ΔE 2.3');
    expect(text).toContain('ΔE 0.8');
    expect(text).toContain('Nord Deep');
  });

  it('reads out its own distance so it is not mistaken for the closest match', () => {
    render(<Popular popular={popular} topName="Nord Deep" />);
    const text = screen.getByTestId('popular').textContent ?? '';
    expect(text).toContain('ΔE 1.4');
    expect(text).toContain('ΔE 1.4 from your screenshot');
    expect(text).toContain('colors the eye cannot tell apart');
    expect(text).toContain('Not the closest match');
  });

  it('renders nothing when the first result is already the most installed', () => {
    const { container } = render(
      <Popular popular={null} topName="Nord Deep" />,
    );
    expect(container.innerHTML).toBe('');
  });
});
