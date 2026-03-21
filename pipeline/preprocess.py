import re
import html
import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

STOPWORDS = {
    "이", "가", "을", "를", "은", "는", "에", "의", "와", "과",
    "도", "로", "으로", "에서", "부터", "까지", "보다", "만", "고",
    "하다", "있다", "없다", "되다", "이다", "아니다", "것", "수",
    "그", "이", "저", "것", "등", "및", "또", "더", "그리고",
    "하지만", "그러나", "따라서", "즉", "또한", "뉴스", "기자",
    "앵커", "영상", "구독", "좋아요", "알림", "설정", "shorts",
    "기사", "라이브", "생방송", "자막", "현장", "연결", "속보",
}


def clean_text(text: str) -> str:
    if not text:
        return ""

    # HTML 엔티티 디코딩 (&quot; → " 등)
    text = html.unescape(text)

    # 이모지 제거
    text = re.sub(r'[^\w\s\.,!?ㄱ-ㅎ가-힣]', ' ', text)

    # 대괄호 태그 제거 ([이슈], [자막뉴스], [🔴LIVE] 등)
    text = re.sub(r'\[.*?\]', '', text)

    # URL 제거
    text = re.sub(r'https?://\S+', '', text)

    # 특수문자 제거 (한글, 영문, 숫자, 기본 문장부호만 남김)
    text = re.sub(r'[^\w\sㄱ-ㅎ가-힣.,!?]', ' ', text)

    # 여러 공백 → 하나로
    text = re.sub(r'\s+', ' ', text).strip()

    return text


def remove_stopwords(text: str) -> str:
    words = text.split()
    filtered = [w for w in words if w not in STOPWORDS and len(w) > 1]
    return " ".join(filtered)


def preprocess(text: str) -> str:
    cleaned = clean_text(text)
    return remove_stopwords(cleaned)


def run():
    print("전처리 시작...")

    articles = supabase.table("articles").select("id, title, description").execute().data
    print(f"총 {len(articles)}개 기사 처리 중...")

    for article in articles:
        raw = f"{article.get('title', '')} {article.get('description', '')}"
        processed = preprocess(raw)

        supabase.table("articles").update({
            "transcript": processed
        }).eq("id", article["id"]).execute()

    print("전처리 완료!")


if __name__ == "__main__":
    run()
