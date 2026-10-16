import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { FEATURED_FOODS, HERO_IMAGE, STORY_IMAGE } from '../assets/foodImages.js';
import styles from './Home.module.css';
import sf from './Storefront.module.css';

// Introductory / showcase page only (no ordering logic, no Cart/Menu buttons —
// navigation to Cart/Menu happens through the top navbar).
// Icon-tiles category model: matches the "Categories" icon-tiles card design
// (active orange tile + pastel icon squares + item counts). All tiles still
// link to /menu — visual selection only, no filtering logic lives here.
function CatIcon({ name }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };
  if (name === 'Pizza')
    return (
      <svg {...common}>
        <path d="M12 3.5 5.5 19.5c-.3.9.5 1.8 1.4 1.4L20 14.5c1-.4 1-1.8 0-2.2L12 3.5Z" />
        <path d="M12 3.5 9.8 12l6.4 1.3" />
        <circle cx="12.6" cy="15.6" r="1" fill="currentColor" stroke="none" />
        <circle cx="15.2" cy="12.4" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  if (name === 'Burgers')
    return (
      <svg {...common}>
        <path d="M4 10a8 8 0 0 1 16 0Z" />
        <path d="M4 13.5h16" />
        <path d="M4 16.5c0 1.4 1.1 2.5 2.5 2.5h11c1.4 0 2.5-1.1 2.5-2.5H4Z" />
        <path d="M9 7.5c0-1 .8-1 .8-2M13 7.5c0-1 .8-1 .8-2" />
      </svg>
    );
  if (name === 'Sushi')
    return (
      <svg {...common}>
        <ellipse cx="12" cy="14" rx="7" ry="3.5" />
        <path d="M5 14c0-2 3-4 7-4s7 2 7 4" />
        <circle cx="10" cy="13" r="1" fill="currentColor" stroke="none" />
        <circle cx="14" cy="13.5" r="1" fill="currentColor" stroke="none" />
        <path d="M9 6.5 15 9M15 6.5 9 9" />
      </svg>
    );
  if (name === 'Salads')
    return (
      <svg {...common}>
        <path d="M4 13h16c0 3-3.5 6-8 6s-8-3-8-6Z" />
        <path d="M8 13c0-3 1-5 4-6-1 2-1 4 0 6M12 13c0-3.5 1.5-5.5 4.5-6.5-.5 2.5-.5 4.5 0 6.5" />
      </svg>
    );
  if (name === 'Dessert')
    return (
      <svg {...common}>
        <path d="M5 19h14M6 19l1-9h10l1 9" />
        <path d="M12 10V6.5" />
        <circle cx="12" cy="5" r="1.4" />
        <path d="M9 13.5h6" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M7 9h10l-1.5 10h-7L7 9Z" />
      <path d="M7 9c0-1.5 1.5-2.5 5-2.5S17 7.5 17 9" />
      <path d="M13 6.5 15.5 3" />
    </svg>
  );
}

const CATEGORIES = [
  { name: 'Pizza', items: 12, iconBg: '#ffedd5', iconColor: '#ea580c' },
  { name: 'Burgers', items: 9, iconBg: '#fef3c7', iconColor: '#d97706' },
  { name: 'Sushi', items: 7, iconBg: '#fce7f3', iconColor: '#db2777' },
  { name: 'Salads', items: 8, iconBg: '#dcfce7', iconColor: '#059669' },
  { name: 'Dessert', items: 10, iconBg: '#fce7f3', iconColor: '#db2777' },
  { name: 'Drinks', items: 11, iconBg: '#e0f2fe', iconColor: '#0284c7' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [activeCategory, setActiveCategory] = useState('Pizza');

  useEffect(() => {
    let cancelled = false;
    api
      .home()
      .then((res) => {
        if (!cancelled && res?.message) setGreeting(res.message);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={sf.page}>
      {/* Hero */}
      <section className={sf.hero}>
        <Reveal>
          <p className={sf.heroEyebrow}>Welcome to Joo Food</p>
          <h1 className={sf.heroTitle}>
            Hungry? <span className={sf.heroTitleAccent}>We deliver happiness.</span>
          </h1>
          <p className={sf.heroSub}>
            {greeting || 'Browse the menu, fill your cart, and track every order from kitchen to door.'}
          </p>
          <div className={sf.heroCtas}>
            <Link className={sf.ctaPrimary} to="/menu">
              Browse menu
            </Link>
            <Link className={sf.ctaGhost} to={isAuthenticated ? '/orders' : '/login'}>
              {isAuthenticated ? 'Track orders' : 'Log in'}
            </Link>
          </div>
          <p className={sf.heroHint}>
            {isAuthenticated
              ? 'Use the navigation bar above to explore the Menu, Cart, and Orders.'
              : 'Browse the Menu above — log in to add to cart and track orders.'}
          </p>
        </Reveal>
        <Reveal delay={120} className={sf.heroMedia}>
          <div className={sf.heroImgWrap}>
            <img src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} loading="lazy" />
          </div>
        </Reveal>
      </section>

      {/* Categories — icon tiles card */}
      <section className={sf.section} aria-label="Categories">
        <div className={sf.catPanel}>
          <div className={sf.sectionHead}>
            <h2 className={sf.sectionTitle}>Categories</h2>
            <Link className={sf.sectionLink} to="/menu">
              See all →
            </Link>
          </div>
          <div className={sf.catTiles} role="list">
            {CATEGORIES.map((c) => {
              const isActive = activeCategory === c.name;
              return (
                <Link
                  key={c.name}
                  to="/menu"
                  role="listitem"
                  aria-pressed={isActive}
                  title={`${c.name} — ${c.items} items`}
                  onClick={() => setActiveCategory(c.name)}
                  onMouseEnter={() => setActiveCategory(c.name)}
                  onFocus={() => setActiveCategory(c.name)}
                  className={`${sf.catTile} ${isActive ? sf.catTileActive : ''}`}
                >
                  <span
                    className={sf.catIcon}
                    style={isActive ? undefined : { background: c.iconBg, color: c.iconColor }}
                    aria-hidden="true"
                  >
                    <CatIcon name={c.name} />
                  </span>
                  <span className={sf.catName}>{c.name}</span>
                  <span className={sf.catCount}>{c.items} items</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Popular right now */}
      <section className={sf.section}>
        <div className={sf.sectionHead}>
          <h2 className={sf.sectionTitle}>Popular right now</h2>
          <Link className={sf.sectionLink} to="/menu">
            Full menu →
          </Link>
        </div>
        <p className={sf.sectionSub}>A taste of what our kitchen prepares fresh every day.</p>
        <div className={sf.grid}>
          {FEATURED_FOODS.map((food) => (
            <Link key={food.caption} to="/menu" className={sf.dishCard}>
              <div className={sf.dishTile}>
                <img src={food.src} alt={food.alt} loading="lazy" />
              </div>
              <div className={sf.dishBody}>
                <h3 className={sf.dishName}>{food.caption}</h3>
                <p className={sf.dishDesc}>{food.alt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className={styles.section}>
        <div className={styles.story}>
          <Reveal className={styles.storyMedia}>
            <div className={styles.zoomFrame}>
              <img src={STORY_IMAGE.src} alt={STORY_IMAGE.alt} loading="lazy" />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <h2 className={styles.sectionTitle}>Our story</h2>
            <p>
              Joo Food started as a small neighborhood kitchen with one promise: honest ingredients,
              cooked to order, and delivered while still hot. Today our chefs prepare every dish
              fresh, and our couriers carry it straight to your door.
            </p>
            <ul className={styles.list}>
              <li>Fresh ingredients, prepared daily</li>
              <li>Live order tracking from kitchen to doorstep</li>
              <li>Friendly support for every order</li>
            </ul>
          </Reveal>
        </div>
      </section>

      {/* Highlights */}
      <section className={styles.section}>
        <Reveal>
          <h2 className={styles.sectionTitle}>Why Joo Food</h2>
        </Reveal>
        <div className={styles.highlights}>
          {[
            { title: 'Fast delivery', text: 'Hot meals at your door with live status updates.' },
            { title: 'Kitchen fresh', text: 'Every order is prepared after you confirm it.' },
            { title: 'Easy tracking', text: 'Follow each order from confirmation to delivery.' },
          ].map((h, i) => (
            <Reveal key={h.title} delay={i * 90}>
              <div className={styles.highlightCard}>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
