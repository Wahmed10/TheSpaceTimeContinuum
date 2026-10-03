import { notFound, redirect } from 'next/navigation';
import {
  boundedSearchParams,
  friendlyRedirectHref,
} from '../../lib/exploreNavigation';

type Props = {
  params: Promise<{ alias: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AliasPage({ params, searchParams }: Props) {
  const { alias } = await params;
  const href = friendlyRedirectHref(
    alias,
    boundedSearchParams(await searchParams),
  );
  if (!href) notFound();
  redirect(href);
}
