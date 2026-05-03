'use client';

import { Layout } from '@/components/Layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <Layout role="admin">{children}</Layout>;
}
