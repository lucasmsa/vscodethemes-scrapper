import { marketplaceUrl, previewUrl, themePageUrl } from '@vscodethemes/shared';
import type { RankedMatch } from '../workers/protocol.ts';
import {
  describeDistance,
  formatDistance,
  formatSimilarity,
} from '../lib/distance.ts';

interface MatchesProps {
  matches: RankedMatch[];
}

export function Matches({ matches }: MatchesProps) {
  return (
    <ol className="matches">
      {matches.map((match, i) => {
        const [publisher, extension] = match.theme.id.split('/')[0]!.split('.');
        const linkable = {
          id: match.theme.id,
          extension: {
            publisher: publisher!,
            slug: extension ?? '',
            displayName: '',
            publisherDisplayName: '',
          },
        };
        return (
          <li
            className={`match ${i === 0 ? 'match--top' : ''}`}
            key={match.theme.id}
            data-testid="match-row"
          >
            <img
              className="match__preview"
              src={previewUrl(match.theme, 'js')}
              alt={`${match.theme.displayName} preview`}
              loading={i < 2 ? 'eager' : 'lazy'}
            />
            <div>
              <h3 className="match__name">{match.theme.displayName}</h3>
              <p className="match__ext">{match.theme.extensionDisplayName}</p>
              {match.identical.length > 0 && (
                <details className="match__identical">
                  <summary>
                    and {match.identical.length} identical{' '}
                    {match.identical.length === 1 ? 'palette' : 'palettes'}
                  </summary>
                  <ul>
                    {match.identical.map((twin) => (
                      <li key={twin.id}>
                        <a
                          href={`https://vscodethemes.com/e/${twin.id}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {twin.displayName}
                        </a>{' '}
                        <span>{twin.extensionDisplayName}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              <div className="match__links">
                <a
                  href={themePageUrl(linkable)}
                  target="_blank"
                  rel="noreferrer"
                >
                  vscodethemes.com
                </a>
                <a
                  href={marketplaceUrl(linkable)}
                  target="_blank"
                  rel="noreferrer"
                >
                  marketplace
                </a>
              </div>
            </div>
            <div className="distance">
              {match.similarity !== undefined && (
                <>
                  <div className="distance__value">
                    {formatSimilarity(match.similarity)}
                  </div>
                  <div className="distance__label">model similarity</div>
                </>
              )}
              <div
                className={
                  match.similarity !== undefined
                    ? 'distance__secondary'
                    : 'distance__value'
                }
              >
                ΔE {formatDistance(match.distance)}
              </div>
              <div className="distance__label">
                {describeDistance(match.distance)}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
