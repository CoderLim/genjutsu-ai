export type NavDropdownItem = {
  title: string;
  description: string;
  href: string;
  badge?: string;
  iconSrc?: string;
};

export type NavDropdownGroup = {
  label?: string;
  items: NavDropdownItem[];
};

export type NavItem = {
  label: string;
  href?: string;
  groups?: NavDropdownGroup[];
};

export type ToolCard = {
  title: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
};

export type ModelCard = {
  name: string;
  description: string;
  href: string;
  badge?: string;
  badgeTone?: 'new' | 'hot' | 'sale' | 'coming';
  iconSrc?: string;
  emoji?: string;
  coverSrc?: string;
};

export type FeatureCard = {
  title: string;
  description: string;
};

export type AdvancedTab = {
  id: string;
  label: string;
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
  imageAlt: string;
};

export type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatarSrc: string;
};

export type PricingPlan = {
  name: string;
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
  features?: string[];
  priceLabel?: string;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type FooterColumn = {
  title: string;
  links: { label: string; href: string; badge?: string }[];
};
