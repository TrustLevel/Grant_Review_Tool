import Navbar from '@/components/layout/Navbar';
import React from 'react';

export default function MissionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}