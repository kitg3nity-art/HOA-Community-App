export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  iconName: 'ShoppingBag' | 'Tag' | 'Calendar' | 'Heart' | 'ShieldCheck' | 'Leaf' | 'Trophy' | 'Sparkles' | 'Users';
  colorBg: string;
  colorText: string;
  borderColor: string;
  category: 'MARKETPLACE' | 'EVENTS' | 'COMMUNITY' | 'HOA_SPECIAL';
}

export const BADGE_DEFINITIONS: Record<string, BadgeDefinition> = {
  VERIFIED_RESIDENT: {
    id: 'VERIFIED_RESIDENT',
    name: 'Verified Resident',
    description: 'Officially verified Casa Mira South homeowner / resident',
    iconName: 'ShieldCheck',
    colorBg: 'bg-teal-100',
    colorText: 'text-teal-900',
    borderColor: 'border-teal-300',
    category: 'COMMUNITY'
  },
  MARKETPLACE_STAR: {
    id: 'MARKETPLACE_STAR',
    name: 'Marketplace Contributor',
    description: 'Active marketplace seller providing goods & services to neighbors',
    iconName: 'ShoppingBag',
    colorBg: 'bg-amber-100',
    colorText: 'text-amber-900',
    borderColor: 'border-amber-300',
    category: 'MARKETPLACE'
  },
  MARKETPLACE_TOP_SELLER: {
    id: 'MARKETPLACE_TOP_SELLER',
    name: 'Top Community Merchant',
    description: 'Frequent marketplace contributor with 3+ approved active listings',
    iconName: 'Tag',
    colorBg: 'bg-emerald-100',
    colorText: 'text-emerald-900',
    borderColor: 'border-emerald-300',
    category: 'MARKETPLACE'
  },
  EVENT_HOST: {
    id: 'EVENT_HOST',
    name: 'Community Host',
    description: 'Hosts & organizes vibrant HOA community gatherings and sports events',
    iconName: 'Calendar',
    colorBg: 'bg-indigo-100',
    colorText: 'text-indigo-900',
    borderColor: 'border-indigo-300',
    category: 'EVENTS'
  },
  COMMUNITY_HELPER: {
    id: 'COMMUNITY_HELPER',
    name: 'Neighborly Voice',
    description: 'Helpful resident actively supporting neighbors in community discussions',
    iconName: 'Heart',
    colorBg: 'bg-sky-100',
    colorText: 'text-sky-900',
    borderColor: 'border-sky-300',
    category: 'COMMUNITY'
  },
  ECO_HERO: {
    id: 'ECO_HERO',
    name: 'Green Eco Hero',
    description: 'Recognized for neighborhood cleanliness, recycling & garden initiatives',
    iconName: 'Leaf',
    colorBg: 'bg-lime-100',
    colorText: 'text-lime-900',
    borderColor: 'border-lime-300',
    category: 'HOA_SPECIAL'
  },
  HOA_CHAMPION: {
    id: 'HOA_CHAMPION',
    name: 'HOA Contributor of the Month',
    description: 'Special PMO Board recognition for outstanding community volunteerism',
    iconName: 'Trophy',
    colorBg: 'bg-rose-100',
    colorText: 'text-rose-900',
    borderColor: 'border-rose-300',
    category: 'HOA_SPECIAL'
  }
};

export function parseBadges(badgesData: any): string[] {
  if (!badgesData) return [];
  if (Array.isArray(badgesData)) return badgesData;
  if (typeof badgesData === 'string') {
    try {
      const parsed = JSON.parse(badgesData);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // If comma-separated
      return badgesData.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return [];
}
