# newszips

유튜브 뉴스 영상을 크롤링해서 카테고리 분류 → 핵심어 추출 → AI 요약까지 자동화하고, React 앱으로 서비스하는 풀스택 프로젝트.

**라이브 서비스**: https://newszips.vercel.app
**백엔드 API**: https://perpetual-kindness-production.up.railway.app

---

## 왜 이런 구조인가?

LLM에 기사 본문을 그대로 넘겨 요약을 요청하면, 모델이 스스로 중요하다고 판단한 내용을 요약한다. 이 경우 같은 사건을 다룬 기사라도 요약이 매번 달라지고, 핵심 사실보다 문체나 도입부에 끌려가는 경향이 있다.

이 프로젝트는 요약 전에 **TF-IDF로 핵심어를 먼저 추출**하고, 그 핵심어를 프롬프트에 명시해서 LLM이 어디에 집중해야 하는지를 유도한다. 덕분에 요약의 일관성이 높아지고, 기사의 실제 핵심 내용이 반영될 가능성이 커진다.

TF-IDF는 카테고리별로 따로 학습한다. 같은 "대통령"이라는 단어도 정치 기사에서는 흔한 단어지만 스포츠 기사에서는 특이한 단어이기 때문에, 카테고리 내부 IDF 기준으로 가중치를 계산해야 그 기사에서 실제로 중요한 단어가 핵심어로 올라온다.

---

## 전체 파이프라인

```
유튜브 크롤링 (crawler/)
   ↓
전처리 - 클렌징, 불용어 제거 (pipeline/preprocess.py)
   ↓
BERT → 카테고리 분류 (IT_과학 / 경제 / 사회 / 스포츠 / 연예 / 정치 / 기타)
   ↓
카테고리별 TF-IDF → 핵심어 추출 (기타 제외)
   ↓
OpenAI gpt-4o-mini → 핵심어 기반 요약 (전체 transcript 사용, 3~5문장)
   ↓
Supabase 저장
   ↓
t-SNE → 2D 좌표 계산 → Supabase x, y 저장
```

전체 파이프라인 실행: `python pipeline/run_pipeline.py`

---

## 모델 역할

### BERT (`models/klue_bert_classifier/`)
- 역할: **카테고리 분류 전용**
- 모델: klue/bert-base fine-tuned
- 학습: `classifier/train_bert_colab.ipynb` (Colab, GPU)
- 정확도: 96% (6개 카테고리)
- 임계치: 확신도 50% 미만이면 "기타"로 분류
- 배포: HuggingFace Hub (`SSEUNGSSEUNGWOO/newszips-classifier`)

### TF-IDF (`models/tfidf_vectorizers/tfidf_{카테고리}.pkl` × 6개)
- 역할: **핵심어 추출 전용**
- 카테고리별로 별도 vectorizer 학습 (IT_과학, 경제, 사회, 스포츠, 연예, 정치)
- 학습: `classifier/train_tfidf_colab.ipynb` (Colab, CPU)
- 카테고리별로 나눈 이유: 전체 corpus 기준 IDF를 쓰면 "대통령"이 정치/스포츠에서 같은 가중치. 카테고리 내부 IDF로 계산해야 실제로 특이한 단어가 핵심어로 올라옴.

---

## 크롤러 동작 방식

- 대상 채널: KBS, SBS, YTN
- 자동 실행: 매일 한국시간 오후 6시 (GitHub Actions)
- 채널당 최대 20개
- 필터 조건:
  - 영상 길이 60초~5분 (Shorts 및 장편 제외)
  - 한글 비율 30% 이상 (새벽 영어 뉴스 등 제외)
  - 중복 video_id 스킵

---

## BERT 성능

| 카테고리 | BERT v1 (5개) | BERT v2 (6개) |
|---------|----------------|----------------|
| IT_과학  | 95%            | 94%            |
| 경제     | 96%            | 94%            |
| 사회     | -              | 98%            |
| 스포츠   | 98%            | 97%            |
| 연예     | 98%            | 98%            |
| 정치     | 98%            | 95%            |
| **전체** | **97.0%**      | **96.0%**      |

v2에서 사회 카테고리 추가 → 기존에 사회 기사가 다른 카테고리로 오분류되던 문제 개선.

---

## 프론트엔드 주요 기능

- **언론사 선택** (KBS / SBS / YTN) → 기사 그리드 리스트
- **카테고리 필터** — 상단 고정 탭, 수평 스크롤
- **최근 트렌드** — 최근 48시간 기사 키워드 빈도 집계, 클릭 시 해당 키워드 기사 목록
- **기사 상세** — YouTube 썸네일 클릭 시 영상 재생, AI 요약 + 핵심어 하이라이트, 유사 기사 추천
- **Dev Tools** (`/dev/:id`) — BERT 분류 신뢰도 / t-SNE 위치 / 유사도 거리 / 전체 통계
- **t-SNE 시각화** (`/tsne`) — 전체 기사 2D 임베딩 시각화, 특정 기사 하이라이트 지원

---

## 배포 구조

```
사용자 브라우저
    ↓ 접속
Vercel (React 프론트엔드)
    ↓ API 요청
Railway (FastAPI 백엔드)
    ↓ DB 조회
Supabase (PostgreSQL)
```

- **프론트엔드** (Vercel): https://newszips.vercel.app
- **백엔드** (Railway): https://perpetual-kindness-production.up.railway.app
- **자동 크롤링**: GitHub Actions — 매일 오후 6시 (KST) 자동 실행, 로컬 환경 불필요

---

## 파일 구조

```
classifier/
  train_bert_colab.ipynb     # BERT 분류기 학습 (Colab, GPU)
  train_tfidf_colab.ipynb    # 카테고리별 TF-IDF vectorizer 학습 (Colab, CPU)

pipeline/
  run_pipeline.py            # 전체 파이프라인 실행 진입점
  preprocess.py              # 텍스트 클렌징, 불용어 제거
  classify_and_summarize.py  # 분류 → 핵심어 추출 → 요약
  tsne.py                    # BERT 임베딩 → t-SNE 좌표 계산

crawler/
  youtube_crawler.py         # 유튜브 크롤링 (KBS, SBS, YTN)

models/
  klue_bert_classifier/      # BERT 분류 모델 (HuggingFace에도 업로드됨)
  tfidf_vectorizers/         # 카테고리별 TF-IDF vectorizer (6개)

api/
  main.py                    # FastAPI 서버
    GET /articles            # 기사 목록 (company, category, keyword 필터)
    GET /articles/:id        # 기사 상세
    GET /articles/:id/related  # 유사 기사 (유클리드 거리)
    GET /tsne                # t-SNE 좌표 전체
    GET /trends              # 최근 48시간 키워드 빈도
    GET /stats               # 전체 통계

frontend/
  src/pages/
    SelectCompany.js         # 언론사 선택 + 트렌드 키워드
    ArticleList.js           # 기사 카드 그리드
    ArticleDetail.js         # 기사 상세 + 영상 재생 + 핵심어 하이라이트
    DevPage.js               # 개발자 도구 (분류신뢰도 / t-SNE / 유사도 / 통계)
    TsnePage.js              # t-SNE 시각화

.github/workflows/
  crawl.yml                  # GitHub Actions — 매일 자동 크롤링+요약

data/
  train_data.json            # BERT 학습 데이터
```

---

## 기술 스택

| 역할 | 기술 |
|------|------|
| 분류 | klue/bert-base fine-tuned |
| 핵심어 추출 | 카테고리별 TF-IDF |
| 요약 | OpenAI gpt-4o-mini |
| 시각화 | t-SNE + Plotly |
| DB | Supabase (PostgreSQL) |
| 백엔드 | FastAPI → Railway 배포 |
| 프론트엔드 | React → Vercel 배포 |
| 자동화 | GitHub Actions (매일 오후 6시 KST) |

---

## 환경변수 (.env)

```
SUPABASE_URL=
SUPABASE_KEY=
OPENAI_API_KEY=
YOUTUBE_API_KEY=
```

GitHub Actions Secrets에도 동일하게 설정 필요 (`HF_TOKEN` 추가).
