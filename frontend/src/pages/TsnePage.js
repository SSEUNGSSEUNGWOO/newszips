import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Plot from 'react-plotly.js';
import axios from 'axios';

const API = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const CATEGORY_COLORS = {
  'IT_과학': '#4f86f7',
  '경제': '#f7a844',
  '사회': '#e05c5c',
  '스포츠': '#4caf50',
  '연예': '#c471d9',
  '정치': '#f76c44',
  '기타': '#aaa',
};

function TsnePage() {
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = Number(searchParams.get('highlight'));

  useEffect(() => {
    axios.get(`${API}/tsne`).then((res) => setData(res.data));
  }, []);

  const highlighted = data.find((d) => d.id === highlightId);
  const categories = [...new Set(data.map((d) => d.topic))];

  // 일반 기사 trace (카테고리별)
  const traces = categories.map((cat) => {
    const points = data.filter((d) => d.topic === cat && d.id !== highlightId);
    return {
      type: 'scatter',
      mode: 'markers',
      name: cat,
      x: points.map((d) => d.x),
      y: points.map((d) => d.y),
      text: points.map((d) => d.title),
      customdata: points.map((d) => d.id),
      marker: {
        color: CATEGORY_COLORS[cat] || '#aaa',
        size: 10,
        opacity: highlightId ? 0.55 : 0.85,
        line: { color: '#fff', width: 0.5 },
      },
      hovertemplate: '<b>%{text}</b><extra></extra>',
    };
  });

  // 강조 기사 trace
  if (highlighted) {
    traces.push({
      type: 'scatter',
      mode: 'markers+text',
      name: '현재 기사',
      x: [highlighted.x],
      y: [highlighted.y],
      text: [highlighted.title],
      textposition: 'top center',
      textfont: { size: 11, color: '#111' },
      customdata: [highlighted.id],
      marker: {
        color: CATEGORY_COLORS[highlighted.topic] || '#3355cc',
        size: 20,
        symbol: 'star',
        line: { color: '#fff', width: 2.5 },
      },
      hovertemplate: '<b>%{text}</b><extra>현재 기사</extra>',
      showlegend: false,
    });
  }

  const handleClick = (e) => {
    if (e.points?.length > 0) {
      const id = e.points[0].customdata;
      if (id) navigate(`/articles/${id}`);
    }
  };

  // 강조 기사 중심으로 뷰 범위 설정
  const layout = {
    width: Math.min(window.innerWidth - 60, 900),
    height: 600,
    hovermode: 'closest',
    plot_bgcolor: '#f5f6fa',
    paper_bgcolor: '#fff',
    legend: { orientation: 'h', y: -0.12, font: { color: '#444', size: 11 } },
    margin: { t: 20, l: 40, r: 20, b: 80 },
    xaxis: { showgrid: false, zeroline: false, showticklabels: false },
    yaxis: { showgrid: false, zeroline: false, showticklabels: false },
  };

  if (highlighted) {
    const pad = 15;
    layout.xaxis.range = [highlighted.x - pad, highlighted.x + pad];
    layout.yaxis.range = [highlighted.y - pad, highlighted.y + pad];
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.back} onClick={() => navigate(-1)}>← 뒤로</button>
        <h2 style={styles.title}>
          뉴스 시각화
          {highlighted && <span style={styles.highlightBadge}>📍 {highlighted.title?.slice(0, 20)}...</span>}
        </h2>
      </div>

      <Plot
        data={traces}
        layout={layout}
        onClick={handleClick}
        config={{ displayModeBar: false }}
      />

      <p style={styles.hint}>
        {highlightId ? '⭐ 현재 기사 위치가 표시됩니다 · 다른 점을 클릭하면 해당 기사로 이동' : '점을 클릭하면 해당 기사로 이동합니다'}
      </p>
    </div>
  );
}

const styles = {
  container: { maxWidth: '960px', margin: '0 auto', padding: '1.5rem' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
  back: { background: 'none', border: '1px solid #ccc', borderRadius: '20px', padding: '0.3rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' },
  title: { margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' },
  highlightBadge: { fontSize: '0.75rem', fontWeight: '500', color: '#fff', background: '#3355cc', padding: '0.2rem 0.7rem', borderRadius: '20px' },
  hint: { textAlign: 'center', color: '#999', fontSize: '0.85rem', marginTop: '0.5rem' },
};

export default TsnePage;
