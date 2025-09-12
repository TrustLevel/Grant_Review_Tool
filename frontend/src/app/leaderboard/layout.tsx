import React from 'react';
import Navbar from '@/components/layout/Navbar';

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}