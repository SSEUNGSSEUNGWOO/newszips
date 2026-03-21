import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Plot from 'react-plotly.js';
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

const TABS = ['분류 신뢰도', 't-SNE 위치', '유사도 거리', '전체 통계'];

function DevPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [article, setArticle] = useState(null);
  const [related, setRelated] = useState([]);
  const [tsneData, setTsneData] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get(`${API}/articles/${id}`).then((r) => setArticle(r.data));
    axios.get(`${API}/articles/${id}/related?include_distance=true&top_k=8`).then((r) => setRelated(r.data));
    axios.get(`${API}/tsne`).then((r) => setTsneData(r.data));
    axios.get(`${API}/stats`).then((r) => setStats(r.data));
  }, [id]);

  if (!article) return <div style={styles.loading}>로딩 중...</div>;

  return (
    <div style={styles.page}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.back} onClick={() => navigate(`/articles/${id}`)}>← 기사로</button>
          <div>
            <div style={styles.devLabel}>🛠 DEV TOOLS</div>
            <div style={styles.articleTitle}>{article.title}</div>
          </div>
        </div>
        <span style={{ ...styles.topicBadge, background: TOPIC_COLORS[article.topic] || '#aaa' }}>
          {article.topic}
        </span>
      </div>

      {/* 탭 */}
      <div style={styles.tabs}>
        {TABS.map((t, i) => (
          <button
            key={t}
            style={{ ...styles.tab, ...(tab === i ? styles.tabActive : {}) }}
            onClick={() => setTab(i)}
          >
            {t}
          </button>
        ))}
      </div>

      <div style={styles.body}>
        {tab === 0 && <TopicProbaPanel article={article} />}
        {tab === 1 && <TsnePanel article={article} tsneData={tsneData} navigate={navigate} />}
        {tab === 2 && <RelatedPanel related={related} navigate={navigate} />}
        {tab === 3 && <StatsPanel stats={stats} />}
      </div>
    </div>
  );
}

/* ── 분류 신뢰도 패널 ── */
function TopicProbaPanel({ article }) {
  const proba = article.topic_proba;
  if (!proba) return <Empty text="topic_proba 데이터가 없습니다." />;

  const entries = Object.entries(proba).sort((a, b) => b[1] - a[1]);
  const max = entries[0][1];

  return (
    <div style={styles.panel}>
      <p style={styles.panelDesc}>BERT 모델이 각 카테고리로 분류할 확률입니다.</p>
      <div style={styles.barList}>
        {entries.map(([label, prob]) => (
          <div key={label} style={styles.barRow}>
            <div style={styles.barLabel}>
              <span style={{ ...styles.dot, background: TOPIC_COLORS[label] || '#aaa' }} />
              {label}
            </div>
            <div style={styles.barTrack}>
              <div style={{
                ...styles.barFill,
                width: `${(prob / max) * 100}%`,
                background: TOPIC_COLORS[label] || '#aaa',
                opacity: label === article.topic ? 1 : 0.45,
              }} />
            </div>
            <span style={styles.barValue}>{(prob * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
      <p style={styles.note}>
        최종 분류: <b>{article.topic}</b> (신뢰도 {((proba[article.topic] || 0) * 100).toFixed(1)}%)
      </p>
    </div>
  );
}

/* ── t-SNE 위치 패널 ── */
function TsnePanel({ article, tsneData, navigate }) {
  const categories = [...new Set(tsneData.map((d) => d.topic))];

  const traces = categories.map((cat) => {
    const points = tsneData.filter((d) => d.topic === cat && d.id !== article.id);
    return {
      type: 'scatter', mode: 'markers', name: cat,
      x: points.map((d) => d.x), y: points.map((d) => d.y),
      text: points.map((d) => d.title),
      customdata: points.map((d) => d.id),
      marker: { color: TOPIC_COLORS[cat] || '#aaa', size: 8, opacity: 0.5, line: { color: '#fff', width: 0.5 } },
      hovertemplate: '<b>%{text}</b><extra></extra>',
    };
  });

  const highlighted = tsneData.find((d) => d.id === article.id);
  if (highlighted) {
    traces.push({
      type: 'scatter', mode: 'markers+text', name: '현재 기사', showlegend: false,
      x: [highlighted.x], y: [highlighted.y],
      text: [article.title?.slice(0, 15) + '…'],
      textposition: 'top center',
      textfont: { size: 11, color: '#111' },
      customdata: [highlighted.id],
      marker: { color: TOPIC_COLORS[article.topic] || '#3355cc', size: 20, symbol: 'star', line: { color: '#fff', width: 2 } },
      hovertemplate: '<b>현재 기사</b><extra></extra>',
    });
  }

  const layout = {
    width: Math.min(window.innerWidth - 100, 820),
    height: 480,
    hovermode: 'closest',
    plot_bgcolor: '#f5f6fa', paper_bgcolor: '#fff',
    legend: { orientation: 'h', y: -0.15, font: { size: 11 } },
    margin: { t: 10, l: 30, r: 10, b: 60 },
    xaxis: { showgrid: false, zeroline: false, showticklabels: false },
    yaxis: { showgrid: false, zeroline: false, showticklabels: false },
    ...(highlighted && {
      xaxis: { range: [highlighted.x - 20, highlighted.x + 20], showgrid: false, zeroline: false, showticklabels: false },
      yaxis: { range: [highlighted.y - 20, highlighted.y + 20], showgrid: false, zeroline: false, showticklabels: false },
    }),
  };

  return (
    <div style={styles.panel}>
      <p style={styles.panelDesc}>t-SNE 공간에서 현재 기사(⭐)의 위치입니다. 가까울수록 주제가 유사합니다.</p>
      {tsneData.length === 0
        ? <Empty text="t-SNE 좌표가 없습니다. pipeline/tsne.py를 실행하세요." />
        : <Plot data={traces} layout={layout} onClick={(e) => { if (e.points?.[0]?.customdata) navigate(`/articles/${e.points[0].customdata}`); }} config={{ displayModeBar: false }} />
      }
    </div>
  );
}

/* ── 유사도 거리 패널 ── */
function RelatedPanel({ related, navigate }) {
  if (!related.length) return <Empty text="유사 기사 데이터가 없습니다." />;

  const max = related[related.length - 1]?.distance || 1;

  return (
    <div style={styles.panel}>
      <p style={styles.panelDesc}>t-SNE 좌표 기반 유클리드 거리입니다. 값이 작을수록 유사합니다.</p>
      <div style={styles.barList}>
        {related.map((r) => (
          <div key={r.id} style={{ ...styles.barRow, cursor: 'pointer' }} onClick={() => navigate(`/articles/${r.id}`)}>
            <div style={{ ...styles.barLabel, flex: '0 0 180px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              <span style={{ ...styles.dot, background: TOPIC_COLORS[r.topic] || '#aaa' }} />
              {r.title?.slice(0, 22)}…
            </div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${(r.distance / max) * 100}%`, background: TOPIC_COLORS[r.topic] || '#aaa', opacity: 0.7 }} />
            </div>
            <span style={styles.barValue}>{r.distance?.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <p style={styles.note}>클릭하면 해당 기사로 이동합니다.</p>
    </div>
  );
}

/* ── 전체 통계 패널 ── */
function StatsPanel({ stats }) {
  if (!stats) return <Empty text="통계 로딩 중..." />;

  const summaryRate = ((stats.summarized / stats.total) * 100).toFixed(1);

  return (
    <div style={styles.panel}>
      <p style={styles.panelDesc}>전체 DB 기준 통계입니다.</p>

      <div style={styles.statCards}>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{stats.total}</div>
          <div style={styles.statLabel}>전체 기사</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{stats.summarized}</div>
          <div style={styles.statLabel}>요약 완료</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNum}>{summaryRate}%</div>
          <div style={styles.statLabel}>요약 완료율</div>
        </div>
      </div>

      <div style={styles.subSection}>
        <p style={styles.subTitle}>언론사별</p>
        {Object.entries(stats.by_company).sort((a, b) => b[1] - a[1]).map(([co, cnt]) => (
          <div key={co} style={styles.barRow}>
            <div style={styles.barLabel}><span style={{ ...styles.dot, background: '#555' }} />{co.toUpperCase()}</div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${(cnt / stats.total) * 100}%`, background: '#3355cc' }} />
            </div>
            <span style={styles.barValue}>{cnt}</span>
          </div>
        ))}
      </div>

      <div style={styles.subSection}>
        <p style={styles.subTitle}>카테고리별</p>
        {Object.entries(stats.by_topic).sort((a, b) => b[1] - a[1]).map(([topic, cnt]) => (
          <div key={topic} style={styles.barRow}>
            <div style={styles.barLabel}><span style={{ ...styles.dot, background: TOPIC_COLORS[topic] || '#aaa' }} />{topic}</div>
            <div style={styles.barTrack}>
              <div style={{ ...styles.barFill, width: `${(cnt / stats.total) * 100}%`, background: TOPIC_COLORS[topic] || '#aaa' }} />
            </div>
            <span style={styles.barValue}>{cnt}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Empty({ text }) {
  return <p style={{ color: '#aaa', textAlign: 'center', marginTop: '3rem' }}>{text}</p>;
}

const styles = {
  page: { minHeight: '100vh', background: '#f2f4f7' },
  loading: { textAlign: 'center', marginTop: '6rem', color: '#999' },

  header: {
    background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 60%, #16213e 100%)',
    padding: '1.4rem 1.8rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  back: {
    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
    color: '#fff', fontSize: '0.82rem', padding: '0.35rem 0.8rem', borderRadius: '20px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  devLabel: { fontSize: '0.7rem', fontWeight: '700', letterSpacing: '0.12em', color: '#8899bb', marginBottom: '0.2rem' },
  articleTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#fff', maxWidth: '500px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' },
  topicBadge: { fontSize: '0.75rem', fontWeight: '700', color: '#fff', padding: '0.3rem 0.8rem', borderRadius: '20px', whiteSpace: 'nowrap' },

  tabs: { display: 'flex', gap: 0, background: '#fff', borderBottom: '1px solid #eee', padding: '0 1.8rem' },
  tab: { padding: '0.85rem 1.2rem', fontSize: '0.85rem', fontWeight: '600', border: 'none', background: 'none', cursor: 'pointer', color: '#999', borderBottom: '2px solid transparent' },
  tabActive: { color: '#1a1a2e', borderBottom: '2px solid #1a1a2e' },

  body: { maxWidth: '860px', margin: '0 auto', padding: '1.5rem' },
  panel: { background: '#fff', borderRadius: '16px', padding: '1.6rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  panelDesc: { margin: '0 0 1.4rem', fontSize: '0.85rem', color: '#888' },

  barList: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  barRow: { display: 'flex', alignItems: 'center', gap: '0.8rem' },
  barLabel: { flex: '0 0 90px', fontSize: '0.82rem', color: '#444', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  dot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  barTrack: { flex: 1, height: '10px', background: '#f0f0f0', borderRadius: '6px', overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: '6px', transition: 'width 0.4s ease' },
  barValue: { flex: '0 0 48px', fontSize: '0.8rem', color: '#555', textAlign: 'right', fontVariantNumeric: 'tabular-nums' },

  note: { margin: '1.2rem 0 0', fontSize: '0.78rem', color: '#aaa' },

  statCards: { display: 'flex', gap: '1rem', marginBottom: '1.8rem' },
  statCard: { flex: 1, background: '#f5f6fa', borderRadius: '12px', padding: '1rem', textAlign: 'center' },
  statNum: { fontSize: '1.8rem', fontWeight: '800', color: '#1a1a2e' },
  statLabel: { fontSize: '0.78rem', color: '#888', marginTop: '0.2rem' },
  subSection: { marginTop: '1.4rem' },
  subTitle: { margin: '0 0 0.8rem', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa' },
};

export default DevPage;
