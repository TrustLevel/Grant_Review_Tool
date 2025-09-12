// src/app/onboarding/layout.tsx

import Navbar from '@/components/layout/Navbar';
import React from 'react';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {children}
    </div>
  );
}