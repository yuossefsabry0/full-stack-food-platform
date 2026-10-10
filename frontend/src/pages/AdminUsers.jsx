import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { ADMIN_LINKS, RoleHeader } from '../components/RoleHeader.jsx';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.users)) return d.users;
  return [];
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .adminUsers({ page: 1, limit: 20 })
      .then((res) => setUsers(listOf(res)))
      .catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <RoleHeader title="Joo Food · Admin" links={ADMIN_LINKS} />
      <div className="page">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0 }}>Users</h2>
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
            Total: {users.length}
          </span>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="card" style={{ overflowX: 'auto', marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>
                <th>Name</th>
                <th>Username</th>
                <th>Code</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id || i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td>{u.name}</td>
                  <td>{u.username}</td>
                  <td>{u.publicId || u.userCode || u.code || '—'}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !error && <p className="muted">No users found.</p>}
        </div>
      </div>
    </>
  );
}
