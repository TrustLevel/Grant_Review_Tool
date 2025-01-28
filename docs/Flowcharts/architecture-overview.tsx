import React from 'react';

const ArchitectureOverview = () => {
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold mb-6">TrustLevel Architecture Overview</h1>
      
      {/* Presentation Layer */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-indigo-600">1. Presentation Layer (Next.js + React)</h2>
        <div className="pl-6 space-y-2">
          <h3 className="font-semibold">Core Components:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dashboard Interface</li>
            <li>Review Interface</li>
            <li>Peer Review Interface</li>
            <li>Login & Onboarding Flow</li>
          </ul>
          <h3 className="font-semibold mt-4">Deployment:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>AWS Amplify for hosting</li>
            <li>Automated CI/CD through GitHub Actions</li>
            <li>Automatic HTTPS/SSL</li>
          </ul>
        </div>
      </section>

      {/* Application Layer */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-red-600">2. Application Layer (AWS ECS)</h2>
        <div className="pl-6 space-y-2">
          <h3 className="font-semibold">Core Services:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Auth Service (Wallet/Basic authentication)</li>
            <li>Review Service (Core review logic)</li>
            <li>Reputation Service (Scoring & rewards)</li>
            <li>Assignment Service (Review distribution)</li>
            <li>AI Services:
              <ul className="list-disc pl-6">
                <li>AI Summary Service (OpenAI integration)</li>
                <li>AI Detection Service (Review verification)</li>
              </ul>
            </li>
          </ul>
        </div>
      </section>

      {/* Data Layer */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-blue-600">3. Data Layer (MongoDB Atlas)</h2>
        <div className="pl-6 space-y-2">
          <h3 className="font-semibold">Core Collections:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>reviews: Review data and evaluations</li>
            <li>reviewers: User profiles and expertise</li>
            <li>proposals: Proposal details and metadata</li>
            <li>stats: Aggregated statistics and metrics</li>
          </ul>
        </div>
      </section>

      {/* Integration Layer */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-purple-600">4. Integration Layer</h2>
        <div className="pl-6 space-y-2">
          <h3 className="font-semibold">External Services:</h3>
          <ul className="list-disc pl-6 space-y-1">
            <li>Catalyst Explorer API (Proposal data)</li>
            <li>Mesh SDK (Wallet integration)</li>
            <li>OpenAI API (AI services)</li>
            <li>Social Media APIs</li>
          </ul>
        </div>
      </section>

      {/* Data Flow */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-green-600">5. Key Data Flows</h2>
        <div className="pl-6 space-y-2">
          <h3 className="font-semibold">Write Operations:</h3>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Frontend sends data to ECS backend</li>
            <li>Backend validates using Pydantic models</li>
            <li>Data stored in MongoDB Atlas</li>
            <li>Confirmation returned to frontend</li>
          </ol>
          <h3 className="font-semibold mt-4">Read Operations:</h3>
          <ol className="list-decimal pl-6 space-y-1">
            <li>Frontend requests data via API</li>
            <li>Backend queries MongoDB</li>
            <li>Data processed and formatted</li>
            <li>Response sent to frontend</li>
          </ol>
        </div>
      </section>
    </div>
  );
};

export default ArchitectureOverview;