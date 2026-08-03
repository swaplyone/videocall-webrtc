import React, { useState } from 'react';
import HighEnergyPaperStudio from '../components/landing/HighEnergyPaperStudio';
import PaperRegistrationModal from '../components/landing/PaperRegistrationModal';

export default function LandingPage({ currentUser }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <HighEnergyPaperStudio onOpenWaitlist={() => setModalOpen(true)} />
      <PaperRegistrationModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
