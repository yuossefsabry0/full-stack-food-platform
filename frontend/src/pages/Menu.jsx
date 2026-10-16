import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import sf from './Storefront.module.css';

function unwrapList(res) {
  const data = res?.data;
  if (Array.isArray(data)) return { items: data, meta: res?.meta };
  if (Array.isArray(data?.items)) return { items: data.items, meta: data.meta || res?.meta };
  if (Array.isArray(data?.products)) return { items: data.products, meta: data.meta || res?.meta };
  return { items: [], meta: res?.meta };
}

const CHIPS = ['All', 'Pizza', 'Burger', 'Salad', 'Sushi', 'Dessert'];
const TILES = ['#ffe4e6', '#fef3c7', '#dcfce7', '#e0e7ff', '#fce7f3', '#ffedd5'];

export default function Menu() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [activeChip, setActiveChip] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(q = '') {
    setLoading(true);
    setError('');
    try {
      const res = await api.menu({ search: q || undefined, page: 1, limit: 24 });
      setItems(unwrapList(res).items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function pickChip(chip) {
    setActiveChip(chip);
    const q = chip === 'All' ? '' : chip;
    setSearch(q);
    load(q);
  }

  return (
    <div className={sf.page}>
      <div className={sf.section} style={{ marginTop: 16 }}>
        <h2 className={sf.sectionTitle} style={{ fontSize: 28, marginBottom: 12 }}>
          What are you craving?
        </h2>
        <form
          className={sf.searchBar}
          onSubmit={(e) => {
            e.preventDefault();
            setActiveChip('All');
            load(search);
          }}
          role="search"
        >
          <input
            placeholder="Search dishes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search dishes"
            type="search"
          />
          <button className={sf.ctaPrimary} type="submit" aria-label="Search menu">
            Search
          </button>
        </form>
      </div>

      <div className={sf.chips} role="group" aria-label="Category filters" style={{ marginTop: 16 }}>
        {CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className={`${sf.chip} ${activeChip === chip ? sf.chipActive : ''}`}
            aria-pressed={activeChip === chip}
            onClick={() => pickChip(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {loading && <p className="muted">Loading menu…</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className={sf.grid}>
        {items.map((p, i) => (
          <Link key={p.id} to={`/products/${p.id}`} className={sf.dishCard}>
            <div className={sf.dishTile} style={{ background: TILES[i % TILES.length] }}>
              {(p.imageUrl || p.image) && (
                <img src={p.imageUrl || p.image} alt={p.name} loading="lazy" />
              )}
            </div>
            <div className={sf.dishBody}>
              <h3 className={sf.dishName}>{p.name}</h3>
              <p className={sf.dishDesc}>{p.description || ' '}</p>
              <div className={sf.dishFoot}>
                <span className={sf.dishPrice}>${Number(p.price).toFixed(2)}</span>
                <span className={sf.dishAdd} aria-hidden="true">+</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
      {!loading && !error && items.length === 0 && <p className="muted">No dishes found.</p>}
    </div>
  );
}
