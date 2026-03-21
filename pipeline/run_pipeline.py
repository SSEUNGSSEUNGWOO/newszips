import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from crawler.youtube_crawler import crawl
from pipeline.preprocess import run as preprocess
from pipeline.classify_and_summarize import run as classify_and_summarize
from pipeline.tsne import run as tsne


def run():
    print("=" * 40)
    print("1/4 크롤링")
    print("=" * 40)
    crawl()

    print("\n" + "=" * 40)
    print("2/4 전처리")
    print("=" * 40)
    preprocess()

    print("\n" + "=" * 40)
    print("3/4 분류 / 핵심어 추출 / 요약")
    print("=" * 40)
    classify_and_summarize()

    print("\n" + "=" * 40)
    print("4/4 t-SNE 좌표 계산")
    print("=" * 40)
    tsne()

    print("\n전체 파이프라인 완료!")


if __name__ == "__main__":
    run()
