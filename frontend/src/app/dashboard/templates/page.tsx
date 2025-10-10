import * as React from 'react';
import type { Metadata } from 'next';

import { config } from '@/config';
import { TemplateBuilder } from '@/components/dashboard/templates/template-builder';

export const metadata = { title: `Templates | Dashboard | ${config.site.name}` } satisfies Metadata;

export default function Page(): React.JSX.Element {
  return <TemplateBuilder />;
}