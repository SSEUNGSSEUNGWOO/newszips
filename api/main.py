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
    limit: int = Query(50, description="최대 기사 수"),
):
    """언론사/카테고리별 기사 목록"""
    query = supabase.table("articles").select(
        "id, title, company, topic, keywords, summary, upload_date"
    ).not_.is_("summary", "null")

    if company:
        query = query.eq("company", company)
    if category:
        query = query.eq("topic", category)

    result = query.order("upload_date", desc=True).limit(limit).execute()
    return result.data


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
def get_related(article_id: int, top_k: int = Query(5, description="추천 기사 수")):
    """유클리드 거리 기반 유사 기사 추천"""
    # 전체 좌표 가져오기
    result = supabase.table("articles").select(
        "id, title, topic, company, summary, x, y"
    ).not_.is_("x", "null").execute()

    articles = result.data
    target = next((a for a in articles if a["id"] == article_id), None)

    if not target:
        return {"error": "기사를 찾을 수 없습니다."}

    tx, ty = target["x"], target["y"]

    # 유클리드 거리 계산
    others = [a for a in articles if a["id"] != article_id]
    for a in others:
        a["distance"] = float(np.sqrt((a["x"] - tx) ** 2 + (a["y"] - ty) ** 2))

    others.sort(key=lambda a: a["distance"])
    related = others[:top_k]

    # 거리, 좌표 정보 제거하고 반환
    for a in related:
        del a["x"]
        del a["y"]

    return related
