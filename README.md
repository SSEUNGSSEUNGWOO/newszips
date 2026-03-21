# newszips

유튜브 뉴스 영상을 크롤링해서 카테고리 분류 → 핵심어 추출 → 요약까지 자동화하는 파이프라인.

## 전체 파이프라인

```
유튜브 크롤링 (crawler/)
   ↓
전처리 - 클렌징, 불용어 제거 (pipeline/preprocess.py)
   ↓
BERT → 카테고리 분류 (IT_과학 / 경제 / 사회 / 스포츠 / 연예 / 정치)
   ↓
카테고리별 TF-IDF → 핵심어 추출
   ↓
OpenAI gpt-4o-mini → 핵심어 기반 요약
   ↓
Supabase 저장
```

실행 진입점: `pipeline/classify_and_summarize.py`

---

## 모델 역할

### BERT (`models/klue_bert_classifier/`)
- 역할: **카테고리 분류 전용**
- 모델: klue/bert-base fine-tuned
- 학습: `classifier/train_bert_colab.ipynb` (Colab, GPU)
- 정확도: 96% (6개 카테고리)

### TF-IDF (`models/tfidf_{카테고리}.pkl` × 6개)
- 역할: **핵심어 추출 전용**
- 카테고리별로 별도 vectorizer 학습 (IT_과학, 경제, 사회, 스포츠, 연예, 정치)
- 학습: `classifier/train_tfidf_colab.ipynb` (Colab, CPU)
- 카테고리별로 나눈 이유: 전체 corpus 기준 IDF를 쓰면 "대통령"이 정치/스포츠에서 같은 가중치가 되어버림. 카테고리 내부 IDF로 계산해야 그 카테고리에서 실제로 특이한 단어가 핵심어로 올라옴.

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

## 파일 구조

```
classifier/
  train_bert_colab.ipynb     # BERT 분류기 학습 (Colab)
  train_tfidf_colab.ipynb    # 카테고리별 TF-IDF vectorizer 학습 (Colab)

pipeline/
  preprocess.py              # 텍스트 클렌징, 불용어 제거, Supabase 저장
  classify_and_summarize.py  # 분류 → 핵심어 추출 → 요약 → Supabase 저장

crawler/
  youtube_crawler.py         # 유튜브 크롤링

models/
  klue_bert_classifier/      # BERT 분류 모델
  tfidf_IT_과학.pkl
  tfidf_경제.pkl
  tfidf_사회.pkl
  tfidf_스포츠.pkl
  tfidf_연예.pkl
  tfidf_정치.pkl

data/
  train_data.json            # 학습 데이터 (topic, text)
```

---

## 환경변수 (.env)

```
SUPABASE_URL=
SUPABASE_KEY=
OPENAI_API_KEY=
```
