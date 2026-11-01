import { useEffect, useState } from 'react';
import { Flag, Sparkles } from 'lucide-react';

interface BootScreenProps {
  onDone: () => void;
  /** Shorter, snappier opening for repeat launches inside the Android app. */
  compact?: boolean;
}

/**
 * The opening moment: the mine mark assembles, rings ripple outward, and the
 * wordmark settles before the whole screen lifts away. Pure CSS so it stays
 * smooth on modest phones and is skipped for reduced-motion players.
 */
export default function BootScreen({ onDone, compact = false }: BootScreenProps) {
  const [leaving, setLeaving] = useState(false);
  const total = compact ? 1420 : 2100;
  const lift = total - 420;

  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      const quick = setTimeout(onDone, 260);
      return () => clearTimeout(quick);
    }
    const exit = setTimeout(() => setLeaving(true), lift);
    const finish = setTimeout(onDone, total);
    return () => {
      clearTimeout(exit);
      clearTimeout(finish);
    };
  }, [onDone, lift, total]);

  return (
    <div className={`boot-screen ${leaving ? 'is-leaving' : ''} ${compact ? 'is-compact' : ''}`} aria-hidden="true">
      <div className="boot-glow" />
      <div className="boot-squares">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className={`boot-square boot-square-${index}`} style={{ animationDelay: `${120 + index * 34}ms` }}>
            {index === 4 ? <span className="boot-mine"><span /></span> : index === 0 ? <Flag size={13} strokeWidth={2.4} /> : ''}
          </span>
        ))}
      </div>
      <div className="boot-wordmark">
        minefield<span>.</span>
      </div>
      <div className="boot-tagline"><Sparkles size={12} strokeWidth={1.6} />A little logic. A lot of possibility.</div>
      <div className="boot-loading"><i /><i /><i /></div>
    </div>
  );
}
