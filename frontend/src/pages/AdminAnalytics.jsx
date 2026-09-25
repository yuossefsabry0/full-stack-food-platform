import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ADMIN_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminAnalytics()
      .then((res) => setData(res.data?.analytics || res.data))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <RoleHeader title="Joo Food · Admin" links={ADMIN_LINKS} />
      <div className="page">
        <h2>Analytics (DELIVERED orders only)</h2>
        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && (
          <div className="card">
            <h3>Units sold</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <span>Today: <strong>{Number(data.unitsSold?.today ?? 0)}</strong></span>
              <span>Month: <strong>{Number(data.unitsSold?.month ?? 0)}</strong></span>
              <span>Year: <strong>{Number(data.unitsSold?.year ?? 0)}</strong></span>
            </div>
            <h3>Total sales</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <span>Today: <strong>${Number(data.sales?.today ?? 0).toFixed(2)}</strong></span>
              <span>Month: <strong>${Number(data.sales?.month ?? 0).toFixed(2)}</strong></span>
              <span>Year: <strong>${Number(data.sales?.year ?? 0).toFixed(2)}</strong></span>
            </div>
            <h3>Units per product</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                    <th>Product</th>
                    <th>Units sold</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(data.byProduct) ? data.byProduct : []).map((row, i) => (
                    <tr key={row.productId ?? i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td>{row.productName}</td>
                      <td>{Number(row.unitsSold ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>
              Limitation note: the display shows exactly what the existing backend analytics
              endpoint returns (DELIVERED-only totals); no fields were invented.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
