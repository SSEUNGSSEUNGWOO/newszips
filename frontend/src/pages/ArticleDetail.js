import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const TOPIC_COLORS = {
  'IT_과학': '#4f86f7',
  '경제':    '#f7a844',
  '사회':    '#e05c5c',
  '스포츠':  '#4caf50',
  '연예':    '#c471d9',
  '정치':    '#f76c44',
  '기타':    '#aaa',
};

const COMPANY_COLORS = {
  kbs: '#0057A8',
  sbs: '#1a7a4a',
  ytn: '#E31E2D',
};

function highlightKeywords(text, keywords) {
  if (!keywords?.length || !text) return text;
  const pattern = new RegExp(`(${keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    keywords.includes(part)
      ? <mark key={i} style={{ background: '#dce8ff', color: '#1a3fa8', borderRadius: '3px', padding: '0 2px', fontWeight: '700' }}>{part}</mark>
      : part
  );
}

function ArticleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    axios.get(`${API}/articles/${id}`).then((res) => setArticle(res.data));
    axios.get(`${API}/articles/${id}/related`).then((res) => setRelated(res.data));
    setPlaying(false);
    window.scrollTo(0, 0);
  }, [id]);

  if (!article) return <div style={styles.loading}>로딩 중...</div>;

  return (
    <div style={styles.page}>
      {/* 상단 히어로 */}
      <div style={styles.hero}>
        <div style={styles.heroInner}>
          <div style={styles.topBar}>
            <button style={styles.back} className="hover-btn" onClick={() => navigate(-1)}>← 뒤로</button>
            <button style={styles.devBtn} className="hover-btn" onClick={() => navigate(`/dev/${id}`)}>🛠 Dev</button>
          </div>
          <div style={styles.meta}>
            <span style={{ ...styles.topicBadge, backgroundColor: TOPIC_COLORS[article.topic] || '#aaa' }}>{article.topic}</span>
            <span style={styles.company}>{article.company?.toUpperCase()}</span>
            <span style={styles.date}>{article.upload_date?.slice(0, 10)}</span>
          </div>
          <h1 style={styles.title}>{article.title}</h1>
        </div>
      </div>

      {/* 본문 영역 */}
      <div style={styles.body}>

        {/* 영상 */}
        <div style={styles.videoWrapper}>
          {playing ? (
            <iframe
              style={styles.iframe}
              src={`https://www.youtube.com/embed/${article.video_id}?autoplay=1`}
              title={article.title}
              frameBorder="0"
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          ) : (
            <div style={styles.thumbnailWrapper} onClick={() => setPlaying(true)}>
              <img
                src={`https://img.youtube.com/vi/${article.video_id}/hqdefault.jpg`}
                alt={article.title}
                style={styles.thumbnail}
              />
              <div style={styles.playOverlay}>
                <div style={styles.playBtn}>▶</div>
                <span style={styles.playLabel}>영상 재생</span>
              </div>
            </div>
          )}
        </div>

        {/* 키워드 */}
        {article.keywords?.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>핵심 키워드</p>
            <div style={styles.keywords}>
              {article.keywords.map((k) => (
                <span key={k} style={styles.keyword}>{k}</span>
              ))}
            </div>
          </div>
        )}

        {/* 요약 */}
        <div style={styles.section}>
          <p style={styles.sectionLabel}>AI 요약</p>
          <p style={styles.summary}>{highlightKeywords(article.summary, article.keywords)}</p>
        </div>

        {/* 유사 기사 */}
        {related.length > 0 && (
          <div style={styles.section}>
            <p style={styles.sectionLabel}>유사 기사</p>
            <div style={styles.relatedList}>
              {related.map((r) => (
                <div
                  key={r.id}
                  style={styles.relatedCard}
                  className="hover-lift"
                  onClick={() => navigate(`/articles/${r.id}`)}
                >
                  <img
                    src={`https://img.youtube.com/vi/${r.video_id}/hqdefault.jpg`}
                    alt={r.title}
                    style={styles.relatedThumb}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div style={styles.relatedContent}>
                    <div style={styles.relatedMeta}>
                      <span style={{ ...styles.relatedTopic, backgroundColor: TOPIC_COLORS[r.topic] || '#aaa' }}>{r.topic}</span>
                      <span style={{ ...styles.relatedCompany, color: COMPANY_COLORS[r.company] || '#888', borderColor: COMPANY_COLORS[r.company] || '#888' }}>{r.company?.toUpperCase()}</span>
                      <span style={styles.relatedDate}>{r.upload_date?.slice(0, 10)}</span>
                    </div>
                    <p style={styles.relatedTitle}>{r.title}</p>
                    <p style={styles.relatedSummary}>{r.summary?.slice(0, 60)}...</p>
                  </div>
                </div>
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
  },
  loading: {
    textAlign: 'center',
    marginTop: '6rem',
    color: '#999',
  },

  // 히어로
  hero: {
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 60%, #16213e 100%)',
    padding: '2rem 2rem 2.5rem',
    color: '#fff',
  },
  heroInner: {
    maxWidth: '760px',
    margin: '0 auto',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.2rem',
  },
  back: {
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff',
    fontSize: '0.85rem',
    padding: '0.4rem 0.9rem',
    borderRadius: '20px',
    cursor: 'pointer',
  },
  devBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.15)',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '0.75rem',
    padding: '0.35rem 0.8rem',
    borderRadius: '20px',
    cursor: 'pointer',
    letterSpacing: '0.03em',
  },
  meta: {
    display: 'flex',
    gap: '0.6rem',
    alignItems: 'center',
    marginBottom: '0.8rem',
  },
  topicBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#fff',
    background: 'rgba(255,255,255,0.15)',
    padding: '0.25rem 0.7rem',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  company: {
    fontSize: '0.82rem',
    color: '#aac4ff',
    fontWeight: '600',
  },
  date: {
    fontSize: '0.82rem',
    color: 'rgba(255,255,255,0.4)',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '800',
    lineHeight: 1.45,
    margin: 0,
    color: '#fff',
    letterSpacing: '-0.02em',
  },

  // 본문
  body: {
    maxWidth: '760px',
    margin: '0 auto',
    padding: '1.5rem 1.5rem 4rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },

  // 영상
  videoWrapper: {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%',
    borderRadius: '14px',
    overflow: 'hidden',
    background: '#000',
    boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
  },
  iframe: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
  },
  thumbnailWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: 'pointer',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'background 0.2s',
  },
  playBtn: {
    fontSize: '2.2rem',
    color: '#fff',
    background: 'rgba(0,0,0,0.6)',
    border: '3px solid rgba(255,255,255,0.8)',
    borderRadius: '50%',
    width: '72px',
    height: '72px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: '4px',
  },
  playLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: '0.82rem',
    fontWeight: '600',
    letterSpacing: '0.05em',
  },

  // 섹션 공통
  section: {
    background: '#fff',
    borderRadius: '14px',
    padding: '1.4rem 1.6rem',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  sectionLabel: {
    margin: '0 0 0.9rem',
    fontSize: '0.72rem',
    fontWeight: '700',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#aaa',
  },

  // 키워드
  keywords: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  keyword: {
    padding: '0.35rem 0.9rem',
    background: '#f0f4ff',
    color: '#3355cc',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: '600',
    border: '1px solid #d0dbff',
  },

  // 요약
  summary: {
    margin: 0,
    fontSize: '1rem',
    lineHeight: 1.9,
    color: '#333',
  },

  // 유사 기사
  relatedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.8rem',
  },
  relatedCard: {
    display: 'flex',
    gap: '0.9rem',
    padding: '0.8rem',
    background: '#f8f9fc',
    borderRadius: '10px',
    cursor: 'pointer',
    border: '1px solid #eef0f5',
    transition: 'background 0.15s',
  },
  relatedThumb: {
    width: '100px',
    height: '64px',
    objectFit: 'cover',
    borderRadius: '8px',
    flexShrink: 0,
  },
  relatedContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
  },
  relatedMeta: {
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
  },
  relatedTopic: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#fff',
    background: '#555',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  relatedCompany: {
    fontSize: '0.7rem',
    fontWeight: '700',
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    border: '1.5px solid',
    background: 'transparent',
  },
  relatedDate: {
    marginLeft: 'auto',
    fontSize: '0.72rem',
    color: '#bbb',
  },
  relatedTitle: {
    margin: 0,
    fontWeight: '700',
    fontSize: '0.88rem',
    color: '#222',
    lineHeight: 1.4,
  },
  relatedSummary: {
    margin: 0,
    fontSize: '0.78rem',
    color: '#888',
    lineHeight: 1.4,
  },
};

export default ArticleDetail;
