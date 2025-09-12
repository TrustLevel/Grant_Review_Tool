// /Users/dominiktilman/Documents/Dev/proposal-reviewing-tool/frontend/src/components/layout/Navbar.tsx

'use client';

import { useState } from 'react';
import Link from "next/link";
import { useAuth } from '@/app/lib/auth';

// interface FundStatus {
//   fundNumber: number;
//   name: string;
//   status: string;
//   budget: {
//     total: number;
//     currency: string;
//   };
//   timeline: {
//     reviewStart: string;
//     reviewEnd: string;
//   };
// }

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white shadow-sm border-b border-gray-200">
      {/* Logo & Branding */}
      <div className="flex items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2">
          <img 
            src="/TrustLevel_JPG_LOGO.jpg" 
            alt="TrustLevel Logo" 
            className="h-8 w-auto cursor-pointer hover:opacity-80 transition-opacity"
          />
          <span className="text-black font-bold text-xl">REVIEW TOOL</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-semibold">v1 BETA</span>
        </div>
      </div>

      {/* Fund Name & Feedback */}
      <div className="hidden md:flex items-center gap-3">
        <span className="text-lg font-semibold text-black">Project Catalyst – Fund 14</span>
        <button 
          onClick={() => window.open('https://forms.gle/FZAYipQFfir17u1B6', '_blank')}
          className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold hover:bg-blue-200 transition-colors cursor-pointer flex items-center gap-1"
          title="Report bugs or give feedback"
        >
          🐛 Feedback
        </button>
      </div>

      {/* User Account */}
      <div className="relative">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {user?.username || 'User'}
        </button>
        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-md z-10 text-gray-800">
            <Link href="/dashboard" className="block px-4 py-2 hover:bg-gray-300">
              Dashboard
            </Link>
            <Link href="/my-reviews" className="block px-4 py-2 hover:bg-gray-300">
              My Reviews
            </Link>
            <Link href="/my-peer-reviews" className="block px-4 py-2 hover:bg-gray-300">
              My Peer-Reviews
            </Link>
            <Link href="/leaderboard" className="block px-4 py-2 hover:bg-gray-300">
              Leaderboard
            </Link>
            <Link href="/missions" className="block px-4 py-2 hover:bg-gray-300">
              Missions
            </Link>
            <Link href="/settings" className="block px-4 py-2 hover:bg-gray-300">
              Settings
            </Link>
            {user?.role === 'admin' && (
              <>
                <hr />
                <Link href="/admin" className="block px-4 py-2 hover:bg-gray-300 text-gray-800">
                  🛠️ Admin Panel
                </Link>
              </>
            )}
            <hr />
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
          )}
      </div>
    </nav>
  );
}