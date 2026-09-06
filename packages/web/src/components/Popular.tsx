import {
  LOOKALIKE_BAND,
  marketplaceUrl,
  previewUrl,
  themePageUrl,
} from '@vscodethemes/shared';
import type { PopularMatch } from '../workers/protocol.ts';
import {
  describeDistance,
  formatCount,
  formatDistance,
} from '../lib/distance.ts';

interface PopularProps {
  popular: PopularMatch | null;
  topName: string;
}

export function Popular({ popular, topName }: PopularProps) {
  if (!popular) return null;
  const [publisher, extension] = popular.theme.id.split('/')[0]!.split('.');
  const linkable = {
    id: popular.theme.id,
    extension: {
      publisher: publisher!,
      slug: extension ?? '',
      displayName: '',
      publisherDisplayName: '',
    },
  };
  return (
    <aside className="popular" data-testid="popular">
      <h4 className="popular__label">if you want the popular one</h4>
      <div className="popular__body">
        <img
          className="popular__preview"
          src={previewUrl(popular.theme, 'js')}
          alt={`${popular.theme.displayName} preview`}
          loading="lazy"
        />
        <div>
          <h3 className="popular__name">{popular.theme.displayName}</h3>
          <p className="popular__ext">{popular.theme.extensionDisplayName}</p>
          <p className="popular__delta">
            ΔE {formatDistance(popular.distance)} from your screenshot,{' '}
            {describeDistance(popular.distance)}
          </p>
          <div className="popular__links">
            <a href={themePageUrl(linkable)} target="_blank" rel="noreferrer">
              vscodethemes.com
            </a>
            <a href={marketplaceUrl(linkable)} target="_blank" rel="noreferrer">
              marketplace
            </a>
          </div>
        </div>
      </div>
      <p className="popular__note">
        Most installed of {formatCount(popular.considered)} themes whose colors
        sit within ΔE {formatDistance(LOOKALIKE_BAND)} of {topName}, a
        difference the eye cannot see; this one is ΔE{' '}
        {formatDistance(popular.apart)} away. Not the closest match to your
        screenshot, the one most people have installed.
      </p>
    </aside>
  );
}
