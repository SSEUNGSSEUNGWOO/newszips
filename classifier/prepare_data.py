import json
import glob
import random
import re
import html
from collections import defaultdict

DATASET_PATH = "/Users/sseung/Documents/study/python_class/dataset/NIKL_NEWSPAPER_2024_v1.0/*.json"
OUTPUT_PATH = "/Users/sseung/Documents/study/pho/newszips/data/train_data.json"
SAMPLES_PER_TOPIC = 2000

TOPIC_MAP = {
    "정치": "정치",
    "경제": "경제",
    "스포츠": "스포츠",
    "연예": "연예",
    "IT/과학": "IT_과학",
    # 사회/생활/문화/미용건강 → 학습 제외, t-SNE에서 기타로 시각화
}


def clean_text(text: str) -> str:
    text = html.unescape(text)
    text = re.sub(r'<.*?>', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def extract_text(doc):
    paragraphs = doc.get("paragraph", [])
    return " ".join(p.get("form", "") for p in paragraphs)


def main():
    print("데이터 로딩 중...")
    buckets = defaultdict(list)

    for filepath in glob.glob(DATASET_PATH):
        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        for doc in data.get("document", []):
            raw_topic = doc.get("metadata", {}).get("topic", "")
            mapped = TOPIC_MAP.get(raw_topic)
            if not mapped:
                continue

    
            text = clean_text(extract_text(doc))
            if len(text) < 50:
                continue

            buckets[mapped].append(text)

        # 모든 카테고리 채워지면 조기 종료
        if all(len(v) >= SAMPLES_PER_TOPIC for v in buckets.values()) and len(buckets) == 5:
            print("모든 카테고리 샘플링 완료, 조기 종료")
            break

    print("\n수집된 샘플 수:")
    result = []
    for topic, texts in buckets.items():
        sampled = random.sample(texts, min(SAMPLES_PER_TOPIC, len(texts)))
        for text in sampled:
            result.append({"topic": topic, "text": text})
        print(f"  {topic}: {len(sampled)}개")

    random.shuffle(result)

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n저장 완료 → {OUTPUT_PATH}")
    print(f"총 {len(result)}개")


if __name__ == "__main__":
    main()
