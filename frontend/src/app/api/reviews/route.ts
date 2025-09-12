// src/app/api/reviews/route.ts
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Wenn ID vorhanden, hole Detail-Daten vom Backend
    if (id) {
      // OLD: const response = await fetch(`http://localhost:3001/api/reviews/${id}`);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews/${id}`);
      
      if (!response.ok) {
        throw new Error(`Backend responded with ${response.status}`);
      }
      
      const reviewDetail = await response.json();
      return NextResponse.json(reviewDetail);
    }
    
    // Sonst hole Liste aller Reviews vom Backend
    // OLD: const response = await fetch('http://localhost:3001/api/reviews');
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviews`);
    
    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }
    
    const reviews = await response.json();
    return NextResponse.json(reviews);
    
  } catch (error) {
    console.error('Error fetching from backend:', error);
    
    // Fallback auf Mock-Daten wenn Backend nicht erreichbar
    if (request.url.includes('?id=')) {
      // Mock Detail-Daten für Notfall
      return NextResponse.json({
        id: 'error-detail',
        title: 'Backend Verbindungsfehler',
        summary: 'Das Backend ist nicht erreichbar. Bitte stelle sicher, dass der Server auf Port 3001 läuft.',
        author: 'System',
        requestedFunds: ' REP0',
        problemStatement: 'Keine Verbindung zum Backend möglich',
        solution: 'Backend neu starten mit: cd backend && npm run dev',
        teamStats: {
          size: "0 members",
          previousProjects: "0",
          githubActivity: "None",
          completionRate: "0%"
        },
        fullProposal: {
          background: "Backend nicht erreichbar",
          approach: "N/A",
          timeline: "N/A",
          milestones: []
        },
        challengeInfo: {
          name: "Error",
          description: "Backend connection failed",
          budget: 0,
          categoryRequirements: [],
          overview: "Backend nicht erreichbar",
          whoShouldApply: "",
          areasOfInterest: [],
          proposalGuidance: [],
          eligibilityCriteria: []
        },
        tags: ['Error'],
        dueDate: 'N/A',
        reward: ' REP0',
      });
    }
    
    // Mock Liste für Notfall
    return NextResponse.json([
      {
        id: 'error-1',
        title: 'Backend nicht erreichbar!',
        summary: 'Stelle sicher dass das Backend auf Port 3001 läuft.',
        author: 'System',
        requestedFunds: ' REP0',
        dueDate: 'N/A',
        reward: ' REP0',
        tags: ['Error'],
        assignedTo: null
      }
    ]);
  }
}