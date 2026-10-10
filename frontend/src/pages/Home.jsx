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
const CATEGORIES = [
  { name: 'Pizza', icon: '🍕', tile: '#ffe4e6' },
  { name: 'Burgers', icon: '🍔', tile: '#fef3c7' },
  { name: 'Sushi', icon: '🍣', tile: '#e0e7ff' },
  { name: 'Salads', icon: '🥗', tile: '#dcfce7' },
  { name: 'Dessert', icon: '🍰', tile: '#fce7f3' },
  { name: 'Drinks', icon: '🥤', tile: '#ffedd5' },
];

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [greeting, setGreeting] = useState('');

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
      <span className={sf.pageLabel}>
        <span className={sf.pageLabelDot} aria-hidden="true" />
        Home Page
      </span>

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

      {/* Categories */}
      <section className={sf.section}>
        <div className={sf.sectionHead}>
          <h2 className={sf.sectionTitle}>Categories</h2>
          <Link className={sf.sectionLink} to="/menu">
            See all →
          </Link>
        </div>
        <div className={sf.grid}>
          {CATEGORIES.map((c) => (
            <Link key={c.name} to="/menu" className={sf.catCard}>
              <span className={sf.catDot} style={{ background: c.tile }} aria-hidden="true">
                {c.icon}
              </span>
              {c.name}
            </Link>
          ))}
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
