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
            outputs = model(**inputs)
            # softmax 확률값 = 카테고리 간 분리가 가장 선명
            probs = torch.softmax(outputs.logits, dim=-1).squeeze().cpu().numpy()
        embeddings.append(probs)
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

    if not os.path.isdir(BERT_MODEL_DIR):
        from huggingface_hub import hf_hub_download
        hf_token = os.getenv("HF_TOKEN")
        hf_repo = "SSEUNGSSEUNGWOO/newszips-classifier"
        bert_files = ["config.json", "model.safetensors", "tokenizer.json", "tokenizer_config.json"]
        os.makedirs(BERT_MODEL_DIR, exist_ok=True)
        for f in bert_files:
            hf_hub_download(repo_id=hf_repo, filename=f"klue_bert_classifier/{f}",
                            local_dir="models", local_dir_use_symlinks=False, token=hf_token)

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(BERT_MODEL_DIR)
    model = AutoModelForSequenceClassification.from_pretrained(BERT_MODEL_DIR)
    model.to(device)
    model.eval()

    embeddings = get_embeddings(texts, tokenizer, model, device)

    print("t-SNE 계산 중...")
    perplexity = min(5, len(texts) - 1)
    tsne = TSNE(n_components=2, random_state=42, perplexity=perplexity, max_iter=3000)
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
