import React from 'react';
import { useNavigate } from 'react-router-dom';
import HighEnergyPaperStudio from '../components/landing/HighEnergyPaperStudio';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function LandingPage({ currentUser }) {
  const navigate = useNavigate();

  const handleRedirectToCaller = () => {
    if (currentUser) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <ErrorBoundary>
      <div>
        <HighEnergyPaperStudio onOpenWaitlist={handleRedirectToCaller} />
      </div>
    </ErrorBoundary>
  );
}
