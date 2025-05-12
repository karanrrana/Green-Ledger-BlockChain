import React, { useEffect, useState } from 'react'
import Web3 from 'web3';


function Navbar() {
  const [address, setAddress] = useState("");
  const [loginText, setLoginText] = useState("Login");



  useEffect(() => {
    const checkLoginStatus = async () => {
      if (window.ethereum && window.ethereum.selectedAddress) {
        setAddress(window.ethereum.selectedAddress);
        setLoginText(window.ethereum.selectedAddress.substring(0, 7));
      }
    };

    checkLoginStatus();
  }, []);



  const connectMetamask = async () => {
    const web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.enable();
    } catch (error) {
      if (error.message === 'User denied account authorization') {
        // handle the case where the user denied the connection request
      } else if (error.message === 'MetaMask is not enabled') {
        // handle the case where MetaMask is not available
      } else {
        // handle other errors
      }
    }
    const accounts = await web3.eth.getAccounts();
    setAddress(accounts[0]);
    setLoginText(accounts[0].substring(0, 7));
    console.log(loginText)
  }


  return (
    <>
      <div className="navbar bg-base-100">
        <div className="navbar-start">

          <a className="btn btn-ghost text-xl">HWM</a>
        </div>
        <div className="navbar-center hidden lg:flex z-20">
          <ul className="menu menu-horizontal px-1">
            <li><a href="/">Home</a></li>
            <li><a href='/SgSt'>Segregation & Storage </a>   </li>
            <li><a href="/Tracking">Transportation</a></li>
            <li><a href="/Dispose">Disposal</a></li>
            <li><a href="/FR">Facility Registration</a></li>
          </ul>
        </div>
        <div className="navbar-end">
          <a className="btn" onClick={connectMetamask}>{loginText}</a>
        </div>
      </div>
    </>
  )
}

export default Navbar
