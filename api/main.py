import os
import numpy as np
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))

app = FastAPI()

# React(Vercel)에서 API 호출할 수 있도록 CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/articles")
def get_articles(
    company: str = Query(None, description="언론사 (kbs, sbs, ytn)"),
    category: str = Query(None, description="카테고리"),
    keyword: str = Query(None, description="키워드 필터"),
    limit: int = Query(50, description="최대 기사 수"),
):
    """언론사/카테고리별 기사 목록"""
    query = supabase.table("articles").select(
        "id, video_id, title, company, topic, keywords, summary, upload_date"
    ).not_.is_("summary", "null")

    if company:
        query = query.eq("company", company)
    if category:
        query = query.eq("topic", category)
    if keyword:
        query = query.contains("keywords", [keyword])

    result = query.order("upload_date", desc=True).limit(limit).execute()
    return result.data


@app.get("/trends")
def get_trends(hours: int = Query(48, description="최근 N시간"), top_k: int = Query(10)):
    """최근 기사 키워드 빈도 집계"""
    from datetime import datetime, timedelta, timezone
    from collections import Counter

    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    result = supabase.table("articles").select("keywords").not_.is_("keywords", "null").gte("upload_date", since).execute()

    counter = Counter()
    for row in result.data:
        for kw in (row["keywords"] or []):
            counter[kw] += 1

    return [{"keyword": kw, "count": cnt} for kw, cnt in counter.most_common(top_k)]


@app.get("/articles/{article_id}")
def get_article(article_id: int):
    """기사 상세"""
    result = supabase.table("articles").select("*").eq("id", article_id).execute()
    if not result.data:
        return {"error": "기사를 찾을 수 없습니다."}
    return result.data[0]


@app.get("/tsne")
def get_tsne():
    """t-SNE 좌표 전체 반환"""
    result = supabase.table("articles").select(
        "id, title, topic, company, x, y"
    ).not_.is_("x", "null").execute()
    return result.data


@app.get("/articles/{article_id}/related")
def get_related(article_id: int, top_k: int = Query(5), include_distance: bool = Query(False)):
    """유클리드 거리 기반 유사 기사 추천"""
    result = supabase.table("articles").select(
        "id, title, topic, company, summary, video_id, upload_date, x, y"
    ).not_.is_("x", "null").execute()

    articles = result.data
    target = next((a for a in articles if a["id"] == article_id), None)

    if not target:
        return {"error": "기사를 찾을 수 없습니다."}

    tx, ty = target["x"], target["y"]

    others = [a for a in articles if a["id"] != article_id]
    for a in others:
        a["distance"] = float(np.sqrt((a["x"] - tx) ** 2 + (a["y"] - ty) ** 2))

    others.sort(key=lambda a: a["distance"])
    related = others[:top_k]

    for a in related:
        del a["x"]
        del a["y"]
        if not include_distance:
            del a["distance"]

    return related


@app.get("/stats")
def get_stats():
    """전체 통계"""
    result = supabase.table("articles").select("company, topic, summary").execute()
    rows = result.data

    from collections import Counter
    company_counts = Counter(r["company"] for r in rows)
    topic_counts = Counter(r["topic"] for r in rows if r["topic"])
    total = len(rows)
    summarized = sum(1 for r in rows if r["summary"])

    return {
        "total": total,
        "summarized": summarized,
        "by_company": dict(company_counts),
        "by_topic": dict(topic_counts),
    }
