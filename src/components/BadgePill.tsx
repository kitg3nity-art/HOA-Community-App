import React from 'react';
import { 
  ShieldCheck, 
  ShoppingBag, 
  Tag, 
  Calendar, 
  Heart, 
  Leaf, 
  Trophy, 
  Sparkles,
  Users
} from 'lucide-react';
import { BADGE_DEFINITIONS, parseBadges } from '../lib/badges';

interface BadgePillProps {
  badgeId: string;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
}

export function renderBadgeIcon(iconName: string, className: string = 'w-3.5 h-3.5') {
  switch (iconName) {
    case 'ShieldCheck': return <ShieldCheck className={className} />;
    case 'ShoppingBag': return <ShoppingBag className={className} />;
    case 'Tag': return <Tag className={className} />;
    case 'Calendar': return <Calendar className={className} />;
    case 'Heart': return <Heart className={className} />;
    case 'Leaf': return <Leaf className={className} />;
    case 'Trophy': return <Trophy className={className} />;
    case 'Users': return <Users className={className} />;
    default: return <Sparkles className={className} />;
  }
}

export default function BadgePill({ badgeId, size = 'sm', showDescription = false }: BadgePillProps) {
  const badge = BADGE_DEFINITIONS[badgeId];
  if (!badge) {
    // Custom unknown badge
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-200">
        <Sparkles className="w-3 h-3 text-amber-500" />
        <span>{badgeId}</span>
      </span>
    );
  }

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-xs sm:text-sm font-extrabold'
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  }[size];

  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border shadow-xs transition-transform hover:scale-105 ${badge.colorBg} ${badge.colorText} ${badge.borderColor} ${sizeClasses}`}
      title={badge.description}
    >
      {renderBadgeIcon(badge.iconName, iconSizes)}
      <span>{badge.name}</span>
      {showDescription && (
        <span className="opacity-75 font-normal hidden sm:inline ml-1">• {badge.description}</span>
      )}
    </div>
  );
}

interface BadgeListProps {
  badges: any;
  size?: 'sm' | 'md' | 'lg';
  limit?: number;
}

export function BadgeList({ badges, size = 'sm', limit }: BadgeListProps) {
  const parsed = parseBadges(badges);
  if (parsed.length === 0) return null;

  const displayBadges = limit ? parsed.slice(0, limit) : parsed;
  const remaining = limit && parsed.length > limit ? parsed.length - limit : 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {displayBadges.map((id, idx) => (
        <React.Fragment key={`${id}-${idx}`}>
          <BadgePill badgeId={id} size={size} />
        </React.Fragment>
      ))}
      {remaining > 0 && (
        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
