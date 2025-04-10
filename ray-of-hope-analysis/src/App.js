import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import RayOfHopeAnalysis from './RayOfHopeAnalysis';
import PlatformComparison from './PlatformComparison';
import NavigationBar from './components/Navbar';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router>
      <div className="App">
        <NavigationBar />
        <main className="container py-4">
          <Routes>
            <Route path="/RoH_Analysis" element={<RayOfHopeAnalysis />} />
            <Route path="/comparison" element={<PlatformComparison />} />
          </Routes>
        </main>
        <footer className="bg-light py-4 mt-4 text-center text-muted">
          <div className="container">
            <p className="mb-0">RoH Dashboard - Created with React and D3</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;