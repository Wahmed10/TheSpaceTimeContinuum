import { notFound } from 'next/navigation';

export const metadata = {
  title: 'Events unavailable — Continuum',
  description: 'Event data has not been added to Continuum yet.',
};

export default function EventPage() {
  notFound();
}
