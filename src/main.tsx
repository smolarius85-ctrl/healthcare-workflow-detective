import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/700.css';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import '@fontsource/source-sans-3/700.css';
import './styles.css';
import { App } from './App';
import { GameProvider } from './state/GameContext';
import { vanishingReferral } from './case/vanishing-referral';
import { rubricKey } from './case/vanishing-referral/rubric';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameProvider c={vanishingReferral} rubric={rubricKey}>
      <App />
    </GameProvider>
  </StrictMode>,
);
