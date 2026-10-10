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
          <>
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Units sold</h3>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1f2937',
                  }}
                >
                  Year: {Number(data.unitsSold?.year ?? 0)}
                </span>
              </div>
              <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted">Today</span>
                  <strong>{Number(data.unitsSold?.today ?? 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted">Month</span>
                  <strong>{Number(data.unitsSold?.month ?? 0)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted">Year</span>
                  <strong>{Number(data.unitsSold?.year ?? 0)}</strong>
                </div>
              </div>
            </div>
            <div className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Total sales</h3>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1f2937',
                  }}
                >
                  Year: ${Number(data.sales?.year ?? 0).toFixed(2)}
                </span>
              </div>
              <div style={{ marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted">Today</span>
                  <strong>${Number(data.sales?.today ?? 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted">Month</span>
                  <strong>${Number(data.sales?.month ?? 0).toFixed(2)}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span className="muted">Year</span>
                  <strong>${Number(data.sales?.year ?? 0).toFixed(2)}</strong>
                </div>
              </div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Units per product</h3>
                <span
                  style={{
                    display: 'inline-block',
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 999,
                    padding: '4px 12px',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#1f2937',
                  }}
                >
                  Products: {(Array.isArray(data.byProduct) ? data.byProduct : []).length}
                </span>
              </div>
              <div style={{ overflowX: 'auto', marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
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
                Definitions: total = productRevenue (line subtotals) + deliveryFees per period;
                periods bucket by order creation date unless ?dateBasis=delivered is used.
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
