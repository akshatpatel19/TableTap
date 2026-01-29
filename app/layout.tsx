'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { OrderProvider } from '@/lib/context/OrderContext';

export default function CafeLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();

  const cafeSlug = params.cafeSlug as string;
  const tableId = parseInt(searchParams.get('table') || '1', 10);

  return (
    <OrderProvider cafeId={cafeSlug} tableId={tableId}>
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </OrderProvider>
  );
}
