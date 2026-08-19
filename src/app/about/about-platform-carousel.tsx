'use client';

import { CircularCarousel } from '@/components/ui/circular-carousel';

const items = [
  {
    id: '1',
    title: 'Campus-first search',
    description:
      'Browse flats, PGs, and shared rooms around your college — not a generic city classifieds dump.',
    tag: 'Discovery',
  },
  {
    id: '2',
    title: 'Need Now',
    description:
      'Post a 24-hour housing requirement when you need a place this week. Nearby students can respond before the timer runs out.',
    tag: 'Urgent',
  },
  {
    id: '3',
    title: 'Roommate matching',
    description:
      'Find students already living nearby, express interest, and chat in-app before you ever share a number.',
    tag: 'Community',
  },
  {
    id: '4',
    title: 'In-app messaging',
    description:
      'Interests and chats stay on the platform. Listing cards never dump a public phone number.',
    tag: 'Messaging',
  },
  {
    id: '5',
    title: 'Contact on your terms',
    description:
      'Phone reveal is request-based, time-bounded, and view-limited — or routed to a verified fallback contact.',
    tag: 'Privacy',
  },
  {
    id: '6',
    title: 'Safer listings',
    description:
      'Image checks strip QR codes and contact spam from photos. Report and block stay one tap away.',
    tag: 'Trust',
  },
];

export function AboutPlatformCarousel() {
  return <CircularCarousel items={items} />;
}
