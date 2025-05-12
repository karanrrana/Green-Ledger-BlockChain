import React from 'react'
import Navbar from './Navbar'

function Addition() {
  return (<>
    
<Navbar/>
<div className="relative z-10">
<div class="grid grid-cols-3 gap-4 justify-between mt-40 mx-10  z-10">
  <div><div className="card w-96 bg-base-100 shadow-xl mx-2">
  <div className="card-body">
    <h2 className="card-title">Segregation</h2>
    <p>open to add details</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Add</button>
    </div>
  </div>
</div></div>

  <div><div className="card w-96 bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Transportation</h2>
    <p>Add Information</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Add</button>
    </div>
  </div>
</div></div>
  <div><div className="card w-96 bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Storage</h2>
    <p>Add Information</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Add</button>
    </div>
  </div>
</div></div>
  <div><div className="card w-96 bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Disposal</h2>
    <p>Add Information</p>
    <div className="card-actions justify-end">
      <button className="btn btn-primary">Add</button>
    </div>
  </div>
</div></div>
</div></div>
    </>
  )
}

export default Addition
