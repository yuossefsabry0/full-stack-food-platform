import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import AdminShell from '../components/AdminShell.jsx';
import styles from './AdminDashboard.module.css';

function listOf(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.items)) return d.items;
  if (Array.isArray(d?.users)) return d.users;
  return [];
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(String(value));
  } catch {
    // clipboard unavailable (permissions/insecure context): selection fallback
    try {
      const el = document.createElement('textarea');
      el.value = String(value);
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    } catch {
      // best-effort only
    }
  }
}

export default function AdminUsers() {
  const [params, setParams] = useSearchParams();
  const role = params.get('role') || '';
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  function load(r = '') {
    setError('');
    api
      .adminUsers({ page: 1, limit: 20, role: r || undefined })
      .then((res) => setUsers(listOf(res)))
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    load(role);
  }, [role]);

  return (
    <AdminShell active="users" title="Users" sub={`Browse customer accounts — total ${users.length}.`}>
        <div className={styles.toolbar} role="toolbar" aria-label="User summary">
          <span className={`${styles.pill} ${styles.pillNeutral}`}>Total: {users.length}</span>
        </div>
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}
        >
          <label className="muted" style={{ fontSize: 13 }} htmlFor="admin-users-role">
            Role filter
          </label>
          <select
            id="admin-users-role"
            className="input"
            value={role}
            onChange={(e) => setParams(e.target.value ? { role: e.target.value } : {})}
            aria-label="Filter users by role"
          >
            <option value="">All roles</option>
            <option value="BASIC">BASIC</option>
            <option value="CHEF">CHEF</option>
            <option value="DELIVERY">DELIVERY</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </form>
        {error && <p className="error" role="alert">{error}</p>}
        {copied && <p className="muted" role="status">Copied ID {copied}</p>}
        <div className={styles.tableCard}>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Username</th>
                <th>Code</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id || i}>
                  <td>
                    {u.id ?? '—'}{' '}
                    {u.id != null && (
                      <button
                        type="button"
                        className="btn"
                        aria-label={`Copy user ID ${u.id}`}
                        onClick={async () => {
                          await copyText(u.id);
                          setCopied(String(u.id));
                        }}
                        style={{ padding: '2px 8px', fontSize: 12 }}
                      >
                        Copy
                      </button>
                    )}
                  </td>
                  <td>
                    <span className={styles.cellName}>
                      <span className={styles.miniAvatar} aria-hidden="true">
                        {(u.name || u.username || '?').charAt(0).toUpperCase()}
                      </span>
                      {u.name}
                    </span>
                  </td>
                  <td>{u.username}</td>
                  <td>{u.publicId || u.userCode || u.code || '—'}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && !error && <p className="muted">No users found. Try clearing the role filter.</p>}
        </div>
    </AdminShell>
  );
}
