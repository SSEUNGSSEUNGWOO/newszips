import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SelectCompany from './pages/SelectCompany';
import ArticleList from './pages/ArticleList';
import ArticleDetail from './pages/ArticleDetail';
import TsnePage from './pages/TsnePage';
import DevPage from './pages/DevPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SelectCompany />} />
        <Route path="/articles" element={<ArticleList />} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="/tsne" element={<TsnePage />} />
        <Route path="/dev/:id" element={<DevPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
