import os
import html
import json
import joblib
import torch
import numpy as np
from dotenv import load_dotenv
from supabase import create_client
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from openai import OpenAI

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)

HF_REPO_ID = "SSEUNGSSEUNGWOO/newszips-classifier"
BERT_MODEL_DIR = "models/klue_bert_classifier"
TFIDF_MODEL_DIR = "models/tfidf_vectorizers"
LABELS = ["IT_과학", "경제", "사회", "스포츠", "연예", "정치"]
TOP_K_KEYWORDS = 5
CONFIDENCE_THRESHOLD = 0.5


def load_models():
    hf_token = os.getenv("HF_TOKEN")

    # 로컬 모델이 있으면 로컬에서, 없으면 HuggingFace에서 직접 로드
    if os.path.isdir(BERT_MODEL_DIR):
        bert_src = BERT_MODEL_DIR
        tfidf_src = TFIDF_MODEL_DIR
        print("로컬 모델 사용")
    else:
        bert_src = HF_REPO_ID
        tfidf_src = None
        print("HuggingFace에서 모델 로드 중...")

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(
        bert_src, subfolder="klue_bert_classifier" if bert_src == HF_REPO_ID else None, token=hf_token
    )
    bert_model = AutoModelForSequenceClassification.from_pretrained(
        bert_src, subfolder="klue_bert_classifier" if bert_src == HF_REPO_ID else None, token=hf_token
    )
    bert_model.to(device)
    bert_model.eval()

    # TF-IDF: 로컬 or HuggingFace에서 다운로드
    if tfidf_src is None:
        from huggingface_hub import hf_hub_download
        import tempfile
        tfidf_dir = tempfile.mkdtemp()
        for label in LABELS:
            path = hf_hub_download(
                repo_id=HF_REPO_ID,
                filename=f"tfidf_vectorizers/tfidf_{label}.pkl",
                token=hf_token,
                local_dir=tfidf_dir
            )
        tfidf_src = os.path.join(tfidf_dir, "tfidf_vectorizers")

    vectorizers = {
        label: joblib.load(os.path.join(tfidf_src, f"tfidf_{label}.pkl"))
        for label in LABELS
    }

    return tokenizer, bert_model, vectorizers, device


def classify(text, tokenizer, bert_model, device):
    inputs = tokenizer(
        [text],
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )
    inputs = {k: v.to(device) for k, v in inputs.items()}

    with torch.no_grad():
        outputs = bert_model(**inputs)
        probs = torch.softmax(outputs.logits, dim=-1)[0].cpu().numpy()

    pred_idx = int(np.argmax(probs))
    confidence = float(probs[pred_idx])
    topic = LABELS[pred_idx] if confidence >= CONFIDENCE_THRESHOLD else "기타"
    topic_proba = {label: round(float(probs[i]), 4) for i, label in enumerate(LABELS)}

    return topic, topic_proba


def extract_keywords(text, topic, vectorizers):
    vectorizer = vectorizers[topic]
    tfidf_matrix = vectorizer.transform([text])
    feature_names = vectorizer.get_feature_names_out()

    scores = np.asarray(tfidf_matrix.todense()).flatten()
    top_indices = scores.argsort()[::-1][:TOP_K_KEYWORDS]
    keywords = [feature_names[i] for i in top_indices if scores[i] > 0]

    return keywords


def summarize(title, text, topic, keywords):
    title = html.unescape(title) if title else ""
    keyword_str = ", ".join(keywords) if keywords else "없음"
    prompt = f"""당신은 뉴스 요약 전문가입니다. 다음 [{topic}] 뉴스 기사를 읽고 핵심 내용을 요약해주세요.

제목: {title}
핵심어: {keyword_str}

기사 내용:
{text}

요약 작성 기준:
- 누가, 무엇을, 왜, 어떻게 했는지 명확히 포함
- 핵심 수치나 구체적 사실이 있으면 반드시 포함
- 3~5문장으로 자연스럽게 작성
- 뉴스 앱 독자가 기사를 읽지 않아도 내용을 파악할 수 있도록 작성
- 불필요한 서두 없이 바로 내용으로 시작"""

    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.3
    )

    return response.choices[0].message.content.strip()


def run():
    print("모델 로딩...")
    tokenizer, bert_model, vectorizers, device = load_models()

    # transcript 있고 topic 없는 기사 가져오기
    articles = supabase.table("articles") \
        .select("id, title, transcript") \
        .is_("topic", "null") \
        .not_.is_("transcript", "null") \
        .execute().data

    print(f"처리할 기사: {len(articles)}개\n")

    for article in articles:
        article_id = article["id"]
        title = article.get("title", "")
        text = article.get("transcript", "")

        if not text:
            continue

        print(f"[{article_id}] {title[:40]}")

        # 1. 분류
        topic, topic_proba = classify(text, tokenizer, bert_model, device)
        confidence = topic_proba.get(topic, 0) * 100
        print(f"  → 카테고리: {topic} ({confidence:.1f}%)")

        # topic 먼저 저장
        supabase.table("articles").update({"topic": topic, "topic_proba": topic_proba}) \
            .eq("id", article_id).execute()

        if topic == "기타":
            summary = summarize(title, text, topic, [])
            print(f"  → 요약: {summary[:60]}...")
            supabase.table("articles").update({"summary": summary}).eq("id", article_id).execute()
            print(f"  ✓ 저장 완료\n")
            continue

        # 2. 키워드 추출
        keywords = extract_keywords(text, topic, vectorizers)
        print(f"  → 핵심어: {keywords}")

        # 3. 요약
        summary = summarize(title, text, topic, keywords)
        print(f"  → 요약: {summary[:60]}...")

        # 저장
        supabase.table("articles").update({
            "keywords": keywords,
            "summary": summary
        }).eq("id", article_id).execute()

        print(f"  ✓ 저장 완료\n")

    print("전체 완료!")


if __name__ == "__main__":
    run()
