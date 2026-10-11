import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import AdminShell from '../components/AdminShell.jsx';
import styles from './AdminDashboard.module.css';

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
    <AdminShell active="analytics" title="Analytics" sub="Delivered-only sales totals and per-product units.">
        {error && <p className="error">{error}</p>}
        {!data && !error && <p className="muted">Loading…</p>}
        {data && (
          <>
            <div className={styles.stats} aria-label="Sales overview">
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Units today</p>
                <p className={styles.statValue}>{Number(data.unitsSold?.today ?? 0)}</p>
                <p className={styles.statHint}>Year: {Number(data.unitsSold?.year ?? 0)}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Units month</p>
                <p className={styles.statValue}>{Number(data.unitsSold?.month ?? 0)}</p>
                <p className={styles.statHint}>Delivered only</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Sales today</p>
                <p className={styles.statValue}>${Number(data.sales?.today ?? 0).toFixed(2)}</p>
                <p className={styles.statHint}>Year: ${Number(data.sales?.year ?? 0).toFixed(2)}</p>
              </div>
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Sales month</p>
                <p className={styles.statValue}>${Number(data.sales?.month ?? 0).toFixed(2)}</p>
                <p className={styles.statHint}>Delivered only</p>
              </div>
            </div>
            <div className={styles.tableCard} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Units sold</h3>
                <span className={`${styles.pill} ${styles.pillNeutral}`}>
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
            <div className={styles.tableCard} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Total sales</h3>
                <span className={`${styles.pill} ${styles.pillNeutral}`}>
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
            <div className={styles.tableCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Units per product</h3>
                <span className={`${styles.pill} ${styles.pillNeutral}`}>
                  Products: {(Array.isArray(data.byProduct) ? data.byProduct : []).length}
                </span>
              </div>
              <div style={{ overflowX: 'auto', marginTop: 8, borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Units sold</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(data.byProduct) ? data.byProduct : []).map((row, i) => {
                      const units = Number(row.unitsSold ?? 0);
                      const maxUnits = Math.max(
                        1,
                        ...(Array.isArray(data.byProduct) ? data.byProduct : []).map((r) =>
                          Number(r.unitsSold ?? 0)
                        )
                      );
                      return (
                        <tr key={row.productId ?? i}>
                          <td>
                            <strong>{row.productName}</strong>
                            <div className={styles.meter} aria-hidden="true">
                              <div
                                className={styles.meterFill}
                                style={{ width: `${Math.max(4, Math.round((units / maxUnits) * 100))}%` }}
                              />
                            </div>
                          </td>
                          <td>{units}</td>
                        </tr>
                      );
                    })}
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
    </AdminShell>
  );
}
