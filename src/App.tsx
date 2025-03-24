import ReactPlayground from './ReactPlayground';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './ReactPlayground/components/HomePage';

import './App.scss';
import { PlaygroundProvider } from './ReactPlayground/PlaygroundContext';

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
