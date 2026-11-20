import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCountdown } from '../utils/campaigns';
import './CampaignBanner.css';

function Countdown({ to, label }) {
  const t = useCountdown(to);
  if (t.done) return null;
  const parts = [['days', t.days], ['hrs', t.hours], ['min', t.minutes], ['sec', t.seconds]];
  return (
    <div className="cb-countdown" role="timer" aria-label={`${label} ${t.days} days ${t.hours} hours ${t.minutes} minutes`}>
      <span className="cb-countdown-label">{label}</span>
      <div className="cb-countdown-boxes">
        {parts.map(([unit, v]) => (
          <span key={unit} className="cb-box"><strong>{String(v).padStart(2, '0')}</strong><small>{unit}</small></span>
        ))}
      </div>
    </div>
  );
}

/**
 * Big sale banner. `asPageHeader` renders it as the header of the sale page (no "Shop the sale" button).
 */
export default function CampaignBanner({ campaign: c, asPageHeader = false }) {
  const scheduled = c.status === 'SCHEDULED';
  const headline = c.headline || c.name;
  const sub = c.subheadline || `Up to ${c.discountPercent}% off — limited time only.`;
  const Wrapper = asPageHeader ? 'header' : 'section';
  return (
    <Wrapper className={`campaign-banner cb-${c.theme || 'dark'} ${c.bannerImageUrl ? 'has-image' : ''}`}>
      {c.bannerImageUrl && <img className="cb-image" src={c.bannerImageUrl} alt="" />}
      <div className="container cb-inner">
        <div className="cb-text">
          <span className="cb-eyebrow">{c.name}</span>
          <h2 className="cb-title">{headline}</h2>
          <p className="cb-sub">{sub}</p>
          {!asPageHeader && (
            <Link to={`/sale/${c.slug}`} className="cb-cta">Shop the sale <ArrowRight size={16} /></Link>
          )}
        </div>
        <div className="cb-side">
          <div className="cb-discount"><span>Up to</span><strong>{c.discountPercent}%</strong><span>off</span></div>
          {c.showCountdown && <Countdown to={scheduled ? c.startsAt : c.endsAt} label={scheduled ? 'Starts in' : 'Ends in'} />}
        </div>
      </div>
    </Wrapper>
  );
}
