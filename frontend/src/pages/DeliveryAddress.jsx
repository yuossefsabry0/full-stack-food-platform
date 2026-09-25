import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';

// Delivery Address route: posts the full address to POST /orders/checkout
// (all six fields required by backend Zod validation).
export default function DeliveryAddress() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    address: '',
    buildingNumber: '',
    apartmentNumber: '',
    streetName: '',
    phoneNumber: '',
  });
  const [error, setError] = useState('');

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.checkout(form);
      navigate('/orders');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <h2>Delivery address</h2>
      <div className="card">
        <form onSubmit={onSubmit}>
          {[
            ['name', 'Recipient name'],
            ['address', 'Address'],
            ['buildingNumber', 'Building number'],
            ['apartmentNumber', 'Apartment number'],
            ['streetName', 'Street name'],
            ['phoneNumber', 'Phone number'],
          ].map(([key, label]) => (
            <label className="field" key={key}>
              {label}
              <input className="input" value={form[key]} onChange={(e) => set(key, e.target.value)} required />
            </label>
          ))}
          {error && <p className="error">{error}</p>}
          <button className="btn btn-primary" type="submit">Place order</button>
        </form>
      </div>
    </div>
  );
}
