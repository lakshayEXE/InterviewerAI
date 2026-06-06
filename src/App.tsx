import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FlowBuilder } from './pages/FlowBuilder';
import { Interviewer } from './pages/Interviewer';
import { WaitingRoom } from './pages/WaitingRoom';
import { Evaluation } from './pages/Evaluation';
import { useInterviewStore } from './store/useInterviewStore';

function App() {
  const setApiKey = useInterviewStore(state => state.setApiKey);
  const apiKey = useInterviewStore(state => state.apiKey);

  useEffect(() => {
    if (!apiKey && import.meta.env.VITE_GEMINI_API_KEY) {
      setApiKey(import.meta.env.VITE_GEMINI_API_KEY);
    }
  }, [apiKey, setApiKey]);

  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="flow" element={<FlowBuilder />} />
        <Route path="session" element={<Interviewer />} />
        <Route path="session/:sessionData" element={<Interviewer />} />
        <Route path="invite/:sessionData" element={<WaitingRoom />} />
        <Route path="evaluation" element={<Evaluation />} />
      </Route>
    </Routes>
  );
}

export default App;
