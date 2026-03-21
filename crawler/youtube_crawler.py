import os
import html
import isodate
from dotenv import load_dotenv
from googleapiclient.discovery import build
from supabase import create_client
from datetime import datetime, timedelta, timezone

load_dotenv()

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MIN_DURATION_SEC = 60   # 1분 (Shorts 제외)
MAX_DURATION_SEC = 300  # 5분
MIN_KOREAN_RATIO = 0.3  # 한글 비율 30% 이상

CHANNELS = {
    "kbs": "UCcQTRi69dsVYHN3exePtZ1A",
    "sbs": "UCkinYTS9IHqOEwR1Sze2JTw",
    "ytn": "UChlgI3UHCOnwUGzWzbJ3H5w",
}

def is_korean(text):
    korean = sum(1 for c in text if '\uAC00' <= c <= '\uD7A3')
    total = sum(1 for c in text if c.strip())
    return (korean / total) >= MIN_KOREAN_RATIO if total > 0 else False


def get_videos(channel_id, max_results=50):
    since = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
    request = youtube.search().list(
        part="snippet",
        channelId=channel_id,
        maxResults=max_results,
        order="date",
        type="video",
        publishedAfter=since
    )
    response = request.execute()

    videos = []
    for item in response.get("items", []):
        video_id = item["id"]["videoId"]
        snippet = item["snippet"]
        videos.append({
            "video_id": video_id,
            "title": html.unescape(snippet.get("title", "")),
            "description": html.unescape(snippet.get("description", "")),
            "upload_date": snippet.get("publishedAt", None),
        })
    return videos

def get_video_details(video_id):
    request = youtube.videos().list(
        part="statistics,contentDetails",
        id=video_id
    )
    response = request.execute()
    items = response.get("items", [])
    if not items:
        return 0, None
    item = items[0]
    view_count = int(item["statistics"].get("viewCount", 0))
    duration_iso = item["contentDetails"].get("duration", "PT0S")
    duration_sec = int(isodate.parse_duration(duration_iso).total_seconds())
    return view_count, duration_sec

def save_to_supabase(article):
    existing = supabase.table("articles").select("id").eq("video_id", article["video_id"]).execute()
    if existing.data:
        print(f"  이미 존재: {article['title'][:30]}")
        return

    supabase.table("articles").insert(article).execute()
    print(f"  저장 완료: {article['title'][:30]}")

def crawl():
    for company, channel_id in CHANNELS.items():
        print(f"\n[{company.upper()}] 크롤링 시작...")
        videos = get_videos(channel_id)

        saved = 0
        for video in videos:
            view_count, duration_sec = get_video_details(video["video_id"])

            if duration_sec is not None and (duration_sec < MIN_DURATION_SEC or duration_sec > MAX_DURATION_SEC):
                print(f"  스킵 ({duration_sec//60}분 {duration_sec%60}초): {video['title'][:30]}")
                continue

            if not is_korean(video["title"] + video["description"]):
                print(f"  스킵 (한글 아님): {video['title'][:30]}")
                continue

            article = {
                "video_id": video["video_id"],
                "company": company,
                "title": video["title"],
                "description": video["description"],
                "transcript": None,
                "topic": None,
                "topic_proba": None,
                "keywords": None,
                "summary": None,
                "view_count": view_count,
                "upload_date": video["upload_date"],
            }
            save_to_supabase(article)
            saved += 1

        print(f"[{company.upper()}] 완료 — {saved}개 저장 / {len(videos)}개 중")

if __name__ == "__main__":
    crawl()
