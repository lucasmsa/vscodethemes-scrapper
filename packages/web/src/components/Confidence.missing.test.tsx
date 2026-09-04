import { render } from '@testing-library/react';

vi.mock('../generated/accuracy.json', () => ({ default: {} }));

const { Confidence } = await import('./Confidence.tsx');

describe('Confidence without a measured run', () => {
  it('renders nothing rather than an unsupported claim', () => {
    const { container } = render(
      <Confidence engine="hybrid" layout="window" />,
    );
    expect(container.innerHTML).toBe('');
  });
});
