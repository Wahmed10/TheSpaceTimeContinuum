import ExploreRouteShell from '../../components/ExploreRouteShell';

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExploreRouteShell>{children}</ExploreRouteShell>;
}
