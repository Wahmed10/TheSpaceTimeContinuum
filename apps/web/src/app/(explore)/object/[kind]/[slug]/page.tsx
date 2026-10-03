import { EXPLORABLE_BODIES } from '@space/domain';
import { notFound } from 'next/navigation';
import { objectMetadata } from '../../../../../lib/objectMetadata';
import { resolveObjectRoute } from '../../../../../lib/routeState';

type Props = { params: Promise<{ kind: string; slug: string }> };

export function generateStaticParams() {
  return EXPLORABLE_BODIES.map((body) => ({
    kind: body.kind,
    slug: body.id.split(':')[1]!,
  }));
}

export async function generateMetadata({ params }: Props) {
  const { kind, slug } = await params;
  const metadata = objectMetadata(kind, slug, process.env.SITE_URL);
  if (!metadata) notFound();
  return metadata;
}

export default async function ObjectPage({ params }: Props) {
  const { kind, slug } = await params;
  if (resolveObjectRoute(kind, slug).status !== 'object') notFound();
  return null;
}
