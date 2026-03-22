import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import kbsBg from '../assets/newszips_kbs.png';
import sbsBg from '../assets/newszips_sbs.png';
import ytnBg from '../assets/newszips_ytn.png';

const COMPANY_BG = { kbs: kbsBg, sbs: sbsBg, ytn: ytnBg };

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CATEGORIES = ['전체', 'IT_과학', '경제', '사회', '스포츠', '연예', '정치', '기타'];

const COMPANY_COLORS = {
  kbs: '#0057A8',
  sbs: '#1a7a4a',
  ytn: '#E31E2D',
};

const TOPIC_COLORS = {
  'IT_과학': '#4f86f7',
  '경제':    '#f7a844',
  '사회':    '#e05c5c',
  '스포츠':  '#4caf50',
  '연예':    '#c471d9',
  '정치':    '#f76c44',
  '기타':    '#aaa',
};

function ArticleList() {
  const [articles, setArticles] = useState([]);
  const [category, setCategory] = useState('전체');
  const [searchParams] = useSearchParams();
  const company = searchParams.get('company');
  const keyword = searchParams.get('keyword');
  const q = searchParams.get('q');
  const navigate = useNavigate();

  useEffect(() => {
    const params = {};
    if (company) params.company = company;
    if (keyword) params.keyword = keyword;
    if (q) params.q = q;
    if (category !== '전체') params.category = category;

    axios.get(`${API}/articles`, { params }).then((res) => {
      setArticles(res.data);
    });
  }, [company, keyword, q, category]);

  const accentColor = COMPANY_COLORS[company] || '#222';

  return (
    <div style={styles.page}>
      {/* 히어로 헤더 */}
      <div style={{
        ...styles.hero,
        backgroundColor: accentColor,
        backgroundImage: COMPANY_BG[company] ? `url(${COMPANY_BG[company]})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <div style={styles.heroOverlay} />
        <div style={styles.heroInner}>
          <button style={styles.back} className="hover-btn" onClick={() => navigate('/')}>← 뒤로</button>
          <div style={styles.heroRow}>
            <div>
              <p style={styles.heroEyebrow}>
                {q ? '검색 결과' : keyword ? '트렌드 키워드' : '채널'}
              </p>
              <h1 style={styles.heroTitle}>
                {q ? `"${q}"` : keyword ? `#${keyword}` : `${company?.toUpperCase()} 뉴스`}
              </h1>
              <p style={styles.heroCount}>
                {articles.length > 0 ? `기사 ${articles.length}개` : '결과 없음'}
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* 카테고리 바 */}
      {!keyword && !q && (
        <div style={styles.categoryBar}>
          <div style={styles.categoryScroll}>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                style={{
                  ...styles.catBtn,
                  ...(category === c ? { ...styles.catBtnActive, background: accentColor, borderColor: accentColor } : {}),
                }}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 기사 목록 */}
      <div style={styles.body}>
        {articles.length === 0 ? (
          <p style={styles.empty}>기사가 없습니다.</p>
        ) : (
          <div style={styles.grid}>
            {articles.map((a) => (
              <div
                key={a.id}
                style={styles.card}
                className="hover-lift"
                onClick={() => navigate(`/articles/${a.id}`)}
              >
                <div style={styles.thumbWrap}>
                  <img
                    src={`https://img.youtube.com/vi/${a.video_id}/hqdefault.jpg`}
                    alt={a.title}
                    style={styles.thumbnail}
                  />
                  <span style={{ ...styles.topicBadge, backgroundColor: TOPIC_COLORS[a.topic] || '#aaa' }}>
                    {a.topic}
                  </span>
                </div>
                <div style={styles.cardContent}>
                  <p style={styles.cardTitle}>{a.title}</p>
                  <div style={styles.cardMeta}>
                    <span style={{ ...styles.companyBadge, color: accentColor, borderColor: accentColor }}>{a.company?.toUpperCase()}</span>
                    <span style={styles.date}>{a.upload_date?.slice(0, 10)}</span>
                  </div>
                </div>
              </div>
            ))}
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
  },
  hero: {
    position: 'relative',
    padding: '1.8rem 1.5rem 0',
    color: '#fff',
    minHeight: '200px',
  },
  heroOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.65) 100%)',
  },
  heroInner: {
    position: 'relative',
    maxWidth: '760px',
    margin: '0 auto',
  },
  back: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: '0.85rem',
    padding: '0.4rem 0.9rem',
    borderRadius: '20px',
    cursor: 'pointer',
    marginBottom: '1rem',
  },
  heroRow: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: '1.4rem',
  },
  heroCount: {
    margin: '0.3rem 0 0',
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  logoWatermark: {
    width: '130px',
    objectFit: 'contain',
    opacity: 0.45,
    filter: 'brightness(0) invert(1)',
    flexShrink: 0,
  },
  heroEyebrow: {
    margin: '0 0 0.2rem',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: '#8899bb',
  },
  heroTitle: {
    margin: 0,
    fontSize: '2rem',
    fontWeight: '900',
    letterSpacing: '-0.03em',
    color: '#fff',
  },
  tsneBtn: {
    padding: '0.5rem 1.1rem',
    fontSize: '0.82rem',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '20px',
    background: 'rgba(255,255,255,0.08)',
    color: '#fff',
    cursor: 'pointer',
    fontWeight: '600',
  },
  categoryBar: {
    background: '#fff',
    borderBottom: '1px solid #eef0f5',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  categoryScroll: {
    display: 'flex',
    gap: '0.5rem',
    overflowX: 'auto',
    padding: '0.8rem 1.5rem',
    maxWidth: '900px',
    margin: '0 auto',
    scrollbarWidth: 'none',
    msOverflowStyle: 'none',
  },
  catBtn: {
    flexShrink: 0,
    padding: '0.45rem 1.1rem',
    fontSize: '0.82rem',
    fontWeight: '600',
    border: '1.5px solid #ddd',
    borderRadius: '20px',
    background: '#fff',
    color: '#666',
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  catBtnActive: {
    color: '#fff',
    border: '1.5px solid',
    fontWeight: '700',
  },
  body: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '1.4rem 1.5rem 4rem',
  },
  empty: {
    textAlign: 'center',
    color: '#aaa',
    marginTop: '3rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '1.1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    border: '1px solid #eef0f5',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  thumbWrap: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%',
    background: '#ddd',
    flexShrink: 0,
  },
  thumbnail: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  topicBadge: {
    position: 'absolute',
    top: '0.5rem',
    left: '0.5rem',
    fontSize: '0.68rem',
    fontWeight: '700',
    color: '#fff',
    padding: '0.2rem 0.55rem',
    borderRadius: '4px',
  },
  cardContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    padding: '0.9rem 1rem',
  },
  cardTitle: {
    margin: 0,
    fontWeight: '700',
    fontSize: '0.92rem',
    color: '#1a1a2e',
    lineHeight: 1.45,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardSummary: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#888',
    lineHeight: 1.5,
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.2rem',
  },
  companyBadge: {
    fontSize: '0.68rem',
    fontWeight: '700',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    border: '1.5px solid',
    background: 'transparent',
  },
  date: {
    fontSize: '0.72rem',
    color: '#bbb',
    marginLeft: 'auto',
  },
};

export default ArticleList;
