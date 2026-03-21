import os
import numpy as np
import torch
from dotenv import load_dotenv
from supabase import create_client
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from sklearn.manifold import TSNE

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BERT_MODEL_DIR = "models/klue_bert_classifier"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_embeddings(texts, tokenizer, model, device):
    embeddings = []
    for text in texts:
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128
        )
        inputs = {k: v.to(device) for k, v in inputs.items()}
        with torch.no_grad():
            outputs = model(**inputs, output_hidden_states=True)
            # [CLS] 토큰 벡터 = 문장 전체의 의미를 담은 벡터
            cls_vector = outputs.hidden_states[-1][:, 0, :].squeeze().cpu().numpy()
        embeddings.append(cls_vector)
    return np.array(embeddings)


def run():
    print("기사 로딩...")
    rows = supabase.table("articles") \
        .select("id, transcript") \
        .not_.is_("transcript", "null") \
        .execute().data

    if len(rows) < 5:
        print(f"기사가 너무 적어요 ({len(rows)}개). 최소 5개 필요.")
        return

    ids = [r["id"] for r in rows]
    texts = [r["transcript"] for r in rows]
    print(f"총 {len(texts)}개 기사 임베딩 추출 중...")

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(BERT_MODEL_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(BERT_MODEL_DIR)
    model.to(device)
    model.eval()

    embeddings = get_embeddings(texts, tokenizer, model, device)

    print("t-SNE 계산 중...")
    perplexity = min(30, len(texts) - 1)
    tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity)
    coords = tsne.fit_transform(embeddings)

    print("DB 저장 중...")
    for i, article_id in enumerate(ids):
        supabase.table("articles").update({
            "x": float(coords[i, 0]),
            "y": float(coords[i, 1])
        }).eq("id", article_id).execute()

    print(f"완료! {len(ids)}개 기사 좌표 저장됨")


if __name__ == "__main__":
    run()
