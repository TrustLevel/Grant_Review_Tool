// src/app/my-peer-reviews/layout.tsx

import Navbar from '@/components/layout/Navbar';
import React from 'react';

export default function MyPeerReviewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {children}
    </div>
  );
}