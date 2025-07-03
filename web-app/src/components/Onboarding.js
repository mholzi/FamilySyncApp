import { useState } from 'react';
import OnboardingWelcome from './OnboardingWelcome';
import OnboardingFamilySetup from './OnboardingFamilySetup';

function Onboarding({ user, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <OnboardingWelcome 
            user={user}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        );
      case 1:
        return (
          <OnboardingFamilySetup 
            user={user}
            onComplete={handleComplete}
            onBack={handleBack}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      {renderStep()}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F2F2F7',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  }
};

export default Onboarding;