import React, { useEffect, useState } from 'react';
import { api } from '../api/client.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { Reveal } from '../components/Reveal.jsx';
import { FEATURED_FOODS, HERO_IMAGE, STORY_IMAGE } from '../assets/foodImages.js';
import styles from './Home.module.css';

// Introductory / showcase page only (no ordering logic, no Cart/Menu buttons —
// navigation to Cart/Menu happens through the top navbar).
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
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <Reveal className={styles.heroText}>
          <p className={styles.eyebrow}>Welcome to Joo Food</p>
          <h1 className={styles.title}>Delicious food, delivered with care.</h1>
          <p className={styles.subtitle}>
            {greeting || 'Browse the menu, fill your cart, and track every order from kitchen to door.'}
          </p>
          <p className={styles.hint}>
            {isAuthenticated
              ? 'Use the navigation bar above to explore the Menu, Cart, and Orders.'
              : 'Browse the Menu above — log in to add to cart and track orders.'}
          </p>
        </Reveal>
        <Reveal delay={120} className={styles.heroMedia}>
          <div className={styles.zoomFrame}>
            <img src={HERO_IMAGE.src} alt={HERO_IMAGE.alt} loading="lazy" />
          </div>
        </Reveal>
      </section>

      {/* Featured dishes */}
      <section className={styles.section}>
        <Reveal>
          <h2 className={styles.sectionTitle}>Featured dishes</h2>
          <p className={styles.sectionSub}>A taste of what our kitchen prepares fresh every day.</p>
        </Reveal>
        <div className={styles.grid}>
          {FEATURED_FOODS.map((food, i) => (
            <Reveal key={food.caption} delay={(i % 3) * 90}>
              <figure className={styles.tile}>
                <div className={styles.zoomFrame}>
                  <img src={food.src} alt={food.alt} loading="lazy" />
                </div>
                <figcaption className={styles.caption}>{food.caption}</figcaption>
              </figure>
            </Reveal>
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
