import { render, screen } from '@testing-library/react';
import { Confidence } from './Confidence.tsx';
import accuracy from '../generated/accuracy.json';

type Measured = Record<
  string,
  | {
      window: { top1: number; top5: number; top5Class: number | null };
      editor: { top1: number; top5: number; top5Class: number | null };
    }
  | undefined
>;

const round = (value: number) => `${Math.round(value)}%`;

describe('Confidence', () => {
  it('reads out the measured window rates as whole percentages', () => {
    const window = (accuracy as Measured).hybrid?.window;
    expect(window).toBeDefined();
    render(<Confidence engine="hybrid" layout="window" />);
    const text = screen.getByTestId('confidence').textContent ?? '';
    expect(text).toContain(round(window!.top5Class ?? window!.top5));
    expect(text).toContain(round(window!.top1));
    expect(text).toContain('whole editor windows');
  });

  it('labels each rate so a number never stands alone', () => {
    render(<Confidence engine="hybrid" layout="window" />);
    const text = screen.getByTestId('confidence').textContent ?? '';
    expect(text).toContain('in the top five');
    expect(text).toContain('ranked first');
  });

  it('names the engine that was measured', () => {
    render(<Confidence engine="knn" layout="window" />);
    expect(screen.getByTestId('confidence').textContent).toContain(
      'color matching alone',
    );
  });

  it('tells a code-only crop what to include for a better result', () => {
    render(<Confidence engine="hybrid" layout="editor-only" />);
    const text = screen.getByTestId('confidence').textContent ?? '';
    expect(text).toContain('code-only crops');
    expect(text).toContain('activity bar and status bar');
  });
});
