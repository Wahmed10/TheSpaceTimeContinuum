import Link from 'next/link';

export default function UnavailablePage({
  events = false,
}: {
  events?: boolean;
}) {
  return (
    <main className="document-page unavailable-page">
      <p className="eyebrow">CONTINUUM</p>
      <h1>
        {events
          ? 'Events are not available yet.'
          : 'This world is not available.'}
      </h1>
      <p>
        {events
          ? 'Event data has not been added. Explore the catalog or choose a date to travel through time.'
          : 'This link does not match a world in the current catalog. Search Explore for a planet, moon, dwarf planet or our Sun.'}
      </p>
      <Link href="/">Return to Explore</Link>
    </main>
  );
}
