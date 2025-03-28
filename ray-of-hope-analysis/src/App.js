import React from 'react';
import './App.css';
import RayOfHopeAnalysis from './RayOfHopeAnalysis';

// Bootstrap CSS
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <div className="App">
      <main className="container py-4">
        <RayOfHopeAnalysis />
      </main>
      <footer className="bg-light py-4 mt-4 text-center text-muted">
        <div className="container">
          <p className="mb-0">Ray of Hope Analytics Dashboard - Created with React and Recharts</p>
          <p className="small mt-2">© 2025 Ray of Hope</p>
        </div>
      </footer>
    </div>
  );
}

export default App;