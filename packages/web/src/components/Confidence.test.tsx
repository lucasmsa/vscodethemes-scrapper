import { render, screen } from '@testing-library/react';
import { Confidence } from './Confidence.tsx';
import accuracy from '../generated/accuracy.json';

type Measured = Record<
  string,
  | { window: { top1: number; top5: number; top5Class: number | null } }
  | undefined
>;

describe('Confidence', () => {
  it('quotes the measured window numbers of the engine in use', () => {
    const window = (accuracy as Measured).hybrid?.window;
    expect(window).toBeDefined();
    render(<Confidence engine="hybrid" layout="window" />);
    const text = screen.getByTestId('confidence').textContent ?? '';
    expect(text).toContain(
      `${(window!.top5Class ?? window!.top5).toFixed(1)}%`,
    );
    expect(text).toContain(`${window!.top1.toFixed(1)}%`);
    expect(text).toContain('whole editor windows');
    expect(text).not.toContain('activity bar and status bar in it');
  });

  it('names the engine that was measured', () => {
    render(<Confidence engine="knn" layout="window" />);
    expect(screen.getByTestId('confidence').textContent).toContain(
      'color matching alone',
    );
  });

  it('warns that a code-only crop does worse', () => {
    render(<Confidence engine="hybrid" layout="editor-only" />);
    expect(screen.getByTestId('confidence').textContent).toContain(
      'activity bar and status bar in it',
    );
  });
});
