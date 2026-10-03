export default function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    search: 'm21 21-4.5-4.5 M19 10.5a8.5 8.5 0 1 1-17 0a8.5 8.5 0 0 1 17 0',
    layers: 'm12 3 10 6-10 6L2 9z M2 14l10 6 10-6 M2 19l10 6 10-6',
    settings:
      'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    close: 'm6 6 12 12 M6 18 18 6',
    back: 'M19 12H5 M11 6l-6 6 6 6',
    focus: 'M8 3H3v5 M16 3h5v5 M3 16v5h5 M21 16v5h-5 M9 12h6 M12 9v6',
    share: 'M12 16V3 M7 8l5-5 5 5 M5 13v8h14v-8',
    help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3 M12 17v1 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
    orbit: 'M20 4C15-1-3 15 3 21S26 10 20 4 M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  };
  return (
    <svg
      viewBox="0 0 24 26"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] ?? paths.orbit} />
    </svg>
  );
}
