'use client';

import { Layout } from '@/components/Layout';

export default function PatientLayout({ children }: { children: React.ReactNode }) {
    return <Layout role="patient">{children}</Layout>;
}
