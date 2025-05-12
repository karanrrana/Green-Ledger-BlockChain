import React from 'react'
import Footer from './components/Footer'
import Navbar from './components/Navbar'
import Home from './components/Home'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Addition from './components/Addition';
import Facility from './components/Facility';
import Segregation from './components/Segregation';
import Tracking from './components/Tracking';
import Disposal from './components/Disposal';
import ContractMethodsCheck from './components/ContractMethodsCheck';

function App() {
  return (
    <>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/SgSt" element={<Segregation />} />
        <Route path="/FR" element={<Facility />} />
        <Route path="/Tracking" element={<Tracking />} />
        <Route path="/Dispose" element={<Disposal />} />
        <Route path="/contract-check" element={<ContractMethodsCheck />} />
      </Routes>

    </>
  )
}

export default App
