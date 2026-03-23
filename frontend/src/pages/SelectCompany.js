import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/newszips_logo.png';
import kbsBg from '../assets/newszips_kbs.png';
import sbsBg from '../assets/newszips_sbs.png';
import ytnBg from '../assets/newszips_ytn.png';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const COMPANIES = [
  { id: 'kbs', name: 'KBS', bg: kbsBg, color: '#0057A8', label: '한국방송공사', desc: '공영방송 대표 뉴스' },
  { id: 'sbs', name: 'SBS', bg: sbsBg, color: '#1a7a4a', label: 'SBS 미디어', desc: '민영방송 메인 뉴스' },
  { id: 'ytn', name: 'YTN', bg: ytnBg, color: '#E31E2D', label: 'YTN 뉴스', desc: '24시간 뉴스 전문채널' },
];

const FEATURES = [
  { icon: '🤖', label: 'AI 자동 요약' },
  { icon: '🏷️', label: '핵심어 추출' },
  { icon: '📊', label: '토픽 시각화' },
  { icon: '📡', label: '매시간 업데이트' },
];

function SelectCompany() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [trends, setTrends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    axios.get(`${API}/trends`).then((res) => setTrends(res.data));
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) navigate(`/articles?q=${encodeURIComponent(q)}`);
  };

  return (
    <div style={styles.page}>
      {/* 히어로 */}
      <div style={styles.hero}>
        {/* 배경 장식 원 */}
        <div style={styles.blob1} />
        <div style={styles.blob2} />

        <div style={styles.heroInner}>
          <div style={styles.logoCard}>
            <img src={logo} alt="newszips" style={styles.logoImg} />
            <div style={styles.features}>
              {FEATURES.map((f) => (
                <span key={f.label} style={styles.featurePill}>
                  {f.icon} {f.label}
                </span>
              ))}
            </div>
          </div>

          {/* 검색창 */}
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="뉴스 검색..."
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn}>검색</button>
          </form>
        </div>
      </div>

      {/* 언론사 선택 */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>채널 선택</p>
        <div style={styles.cards}>
          {COMPANIES.map((c) => (
            <div
              key={c.id}
              style={{
                ...styles.card,
                backgroundImage: `url(${c.bg})`,
                transform: hovered === c.id ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
                boxShadow: hovered === c.id ? `0 16px 40px ${c.color}55` : '0 4px 16px rgba(0,0,0,0.12)',
              }}
              onClick={() => navigate(`/articles?company=${c.id}`)}
              onMouseEnter={() => setHovered(c.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div style={{ ...styles.cardOverlay, background: `${c.color}bb` }} />
              <div style={styles.cardInner}>
                <div style={styles.cardName}>{c.name}</div>
                <p style={styles.cardLabel}>{c.label}</p>
                <p style={styles.cardDesc}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {trends.length > 0 && (
          <div style={styles.trends}>
            <p style={styles.trendsLabel}>🔥 최근 트렌드</p>
            <div style={styles.trendTags}>
              {trends.map((t) => (
                <span
                  key={t.keyword}
                  style={styles.trendTag}
                  className="hover-scale"
                  onClick={() => navigate(`/articles?keyword=${encodeURIComponent(t.keyword)}`)}
                >
                  #{t.keyword}
                  <span style={styles.trendCount}>{t.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f2f4f7',
    display: 'flex',
    flexDirection: 'column',
  },

  // 히어로
  hero: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    padding: '3rem 2rem 3rem',
    textAlign: 'center',
    color: '#fff',
  },
  blob1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(70,100,255,0.15) 0%, transparent 70%)',
    top: '-100px',
    left: '-80px',
    pointerEvents: 'none',
  },
  blob2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(227,30,45,0.12) 0%, transparent 70%)',
    bottom: '-60px',
    right: '-40px',
    pointerEvents: 'none',
  },
  heroInner: {
    position: 'relative',
    maxWidth: '900px',
    margin: '0 auto',
  },
  logoCard: {
    background: '#fff',
    borderRadius: '24px',
    padding: '0 0 1.4rem',
    marginBottom: '1.6rem',
    overflow: 'hidden',
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  logoImg: {
    width: '420px',
    maxWidth: '90vw',
    objectFit: 'contain',
    display: 'block',
  },
  heroSub: { display: 'none' },
  features: {
    display: 'flex',
    gap: '0.4rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: '0 1.2rem',
  },
  featurePill: {
    fontSize: '0.75rem',
    fontWeight: '600',
    color: '#fff',
    background: '#FF8C42',
    borderRadius: '20px',
    padding: '0.3rem 0.8rem',
  },

  // 검색창
  searchForm: {
    display: 'flex',
    gap: '0.5rem',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
  },
  searchInput: {
    flex: 1,
    padding: '0.75rem 1.1rem',
    fontSize: '0.95rem',
    border: '1.5px solid rgba(255,255,255,0.2)',
    borderRadius: '50px',
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    outline: 'none',
    backdropFilter: 'blur(4px)',
  },
  searchBtn: {
    padding: '0.75rem 1.4rem',
    fontSize: '0.9rem',
    fontWeight: '700',
    background: '#fff',
    color: '#1a1a2e',
    border: 'none',
    borderRadius: '50px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },

  // 언론사 선택
  section: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2.5rem 1.5rem 3rem',
  },
  sectionLabel: {
    fontSize: '0.75rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    color: '#aaa',
    textTransform: 'uppercase',
    marginBottom: '1.2rem',
  },
  cards: {
    display: 'flex',
    gap: '1.2rem',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  card: {
    position: 'relative',
    width: 'clamp(140px, 18vw, 220px)',
    height: 'clamp(140px, 18vw, 220px)',
    borderRadius: '20px',
    cursor: 'pointer',
    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    overflow: 'hidden',
  },
  cardOverlay: {
    position: 'absolute',
    inset: 0,
  },
  cardInner: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  cardName: {
    margin: 0,
    fontSize: '2.2rem',
    fontWeight: '900',
    color: '#fff',
    letterSpacing: '-0.02em',
    textShadow: '0 2px 12px rgba(0,0,0,0.3)',
  },
  cardLabel: {
    margin: 0,
    fontSize: '0.75rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  cardDesc: {
    margin: 0,
    fontSize: '0.7rem',
    color: 'rgba(255,255,255,0.6)',
  },
  trends: {
    width: '100%',
    maxWidth: '900px',
    background: '#fff',
    borderRadius: '16px',
    padding: '1.2rem 1.5rem',
    marginBottom: '1.2rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  trendsLabel: {
    margin: '0 0 0.8rem',
    fontSize: '0.78rem',
    fontWeight: '700',
    letterSpacing: '0.08em',
    color: '#888',
    textTransform: 'uppercase',
  },
  trendTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  trendTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.4rem 0.9rem',
    background: '#f0f4ff',
    color: '#3355cc',
    border: '1px solid #d0dbff',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    cursor: 'pointer',
  },
  trendCount: {
    fontSize: '0.72rem',
    background: '#3355cc',
    color: '#fff',
    borderRadius: '10px',
    padding: '0.05rem 0.4rem',
    fontWeight: '700',
  },
  tsneBtn: {
    padding: '0.7rem 1.8rem',
    fontSize: '0.88rem',
    border: '1.5px solid #ccc',
    borderRadius: '50px',
    backgroundColor: '#fff',
    color: '#555',
    cursor: 'pointer',
    fontWeight: '500',
    letterSpacing: '0.02em',
  },
};

export default SelectCompany;
