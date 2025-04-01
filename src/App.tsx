import ReactPlayground from './CodeVerify';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './CodeVerify/components/HomePage';

import './App.scss';
import { PlaygroundProvider } from './CodeVerify/PlaygroundContext';

function App() {
  return (
    <Router>
      <PlaygroundProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/playground" element={<ReactPlayground />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PlaygroundProvider>
    </Router>
  )
}

export default App
