#!/usr/bin/env python3
"""Fetch new articles on AI chatbots and wellbeing into data/news.json.

Sources: The Guardian's public RSS feeds (tags), and Google News RSS searches for
The Wall Street Journal's Family & Tech column (Julie Jargon), global coverage and
Indonesian coverage. Only metadata is kept: headline, source, date, link and a short
standfirst. No article text is stored or redistributed.

Usage: python3 scripts/fetch_news.py [--days N]   (standard library only)
"""
import datetime as dt
import email.utils
import hashlib
import html
import json
import os
import re
import sys
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "news.json")
MAX_ITEMS = 2000
UA = "Mozilla/5.0 (compatible; wellbeing-responsibility-research/1.0; +https://rfim.github.io/wellbeing-responsibility-research/)"

days = 3
if "--days" in sys.argv:
    days = int(sys.argv[sys.argv.index("--days") + 1])

CHATBOT = re.compile(r"chatbot|chat ?gpt|openai|character\.ai|replika|\bAI (companion|friend|girlfriend|boyfriend|therapist|therapy|chatbot)|companion (app|ai|bot)|claude|gemini|woebot|wysa|\bllm|kecerdasan buatan|\bAI\b", re.I)
WELLBEING = re.compile(r"wellbeing|well-being|wellness|mental health|mental-health|loneli|lonely|therap|psycholog|psychiatr|suicid|self-harm|depress|anxiety|delusion|psychosis|emotional|companionship|grief|teen|child|parent|famil|kesehatan mental|kesejahteraan|curhat|psikolog|depresi|kecemasan|bunuh diri|kesepian|remaja|anak|orang tua", re.I)

def gnews(q, lang="en"):
    if lang == "id":
        base = "https://news.google.com/rss/search?q=%s&hl=id&gl=ID&ceid=ID:id"
    else:
        base = "https://news.google.com/rss/search?q=%s&hl=en-GB&gl=GB&ceid=GB:en"
    return base % urllib.parse.quote(q + " when:%dd" % days)

FEEDS = [
    # (group, url, needs_both_filters, language)
    ("guardian", "https://www.theguardian.com/technology/chatbots/rss", "wellbeing", "en"),
    ("guardian", "https://www.theguardian.com/technology/chatgpt/rss", "wellbeing", "en"),
    ("guardian", "https://www.theguardian.com/society/mental-health/rss", "chatbot", "en"),
    ("guardian", "https://www.theguardian.com/technology/artificialintelligenceai/rss", "both", "en"),
    ("guardian", gnews('site:theguardian.com chatbot "mental health" OR wellbeing OR loneliness OR therapy'), "both", "en"),
    ("guardian", gnews('site:theguardian.com "AI companion" OR ChatGPT teenagers OR children'), "both", "en"),
    ("wsj", gnews('"Julie Jargon" AI OR chatbot OR ChatGPT'), "both", "en"),
    ("wsj", gnews('site:wsj.com chatbot teens OR parents OR "mental health" OR loneliness'), "both", "en"),
    ("global", gnews('"AI chatbot" "mental health"'), "both", "en"),
    ("global", gnews('"AI companion" loneliness OR wellbeing'), "both", "en"),
    ("global", gnews('ChatGPT teens parents safety'), "both", "en"),
    ("global", gnews('Character.AI OR Replika lawsuit OR teens'), "both", "en"),
    ("indonesia", gnews('chatbot AI "kesehatan mental"', "id"), "both", "id"),
    ("indonesia", gnews('ChatGPT curhat psikolog', "id"), "both", "id"),
    ("indonesia", gnews('AI anak remaja orang tua chatbot', "id"), "both", "id"),
    ("indonesia", gnews('Riliv OR HIMPSI kecerdasan buatan', "id"), "chatbot", "id"),
    ("indonesia", gnews('Komdigi regulasi AI chatbot anak', "id"), "chatbot", "id"),
]

def clean(s, n=None):
    s = html.unescape(re.sub(r"<[^>]+>", " ", s or ""))
    s = re.sub(r"\s+", " ", s).strip()
    if n and len(s) > n:
        s = s[: n - 1].rsplit(" ", 1)[0] + "…"
    return s

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()

def parse(group, url, need, lang):
    out = []
    root = ET.fromstring(fetch(url))
    for it in root.iter("item"):
        title = clean(it.findtext("title"))
        link = (it.findtext("link") or "").strip()
        if not title or not link:
            continue
        src_el = it.find("source")
        source = clean(src_el.text) if src_el is not None and src_el.text else ("The Guardian" if group == "guardian" else "")
        title = re.sub(r"\s*\|\s*(The Guardian|[A-Z][\w ]{0,40})$", "", title) if group == "guardian" else title
        if source and title.endswith(" - " + source):
            title = title[: -len(" - " + source)].strip()
        desc = "" if "news.google.com" in url else clean(it.findtext("description"), 260)
        try:
            d = email.utils.parsedate_to_datetime(it.findtext("pubDate")).astimezone(dt.timezone.utc)
        except Exception:
            d = dt.datetime.now(dt.timezone.utc)
        text = title + " " + desc
        if need in ("both", "chatbot") and not CHATBOT.search(text):
            continue
        if need in ("both", "wellbeing") and not WELLBEING.search(text):
            continue
        if group == "wsj" and "wsj" not in (source + link).lower() and "wall street" not in source.lower():
            continue
        if group == "guardian" and "guardian" not in (source + link).lower():
            continue
        out.append({
            "id": hashlib.sha1(re.sub(r"\W+", "", re.split(r" \| | - ", title)[0].lower())[:80].encode()).hexdigest()[:12],
            "title": title, "source": source or "Unknown", "group": group, "lang": lang,
            "date": d.strftime("%Y-%m-%dT%H:%MZ"), "url": link, "summary": desc,
        })
    return out

def main():
    try:
        data = json.load(open(OUT, encoding="utf-8"))
    except Exception:
        data = {"items": []}
    items = {x["id"]: x for x in data.get("items", [])}
    now = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    added, errors = 0, []
    for group, url, need, lang in FEEDS:
        try:
            for x in parse(group, url, need, lang):
                if x["id"] in items:
                    continue
                x["added"] = now
                items[x["id"]] = x
                added += 1
        except Exception as e:  # one broken feed must not stop the others
            errors.append("%s: %s" % (url[:80], e))
    ordered = sorted(items.values(), key=lambda x: x["date"], reverse=True)[:MAX_ITEMS]
    data["items"] = ordered
    data["updated"] = now
    data["sources"] = sorted({x["source"] for x in ordered})
    data["note"] = "Metadata only (headline, source, date, link, short standfirst). Keyword-coded in the browser; items with an 'llm' field were reviewed by Claude."
    if added or not os.path.exists(OUT):
        with open(OUT, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=0)
    print("added %d, total %d" % (added, len(ordered)))
    for e in errors:
        print("feed error:", e, file=sys.stderr)

if __name__ == "__main__":
    main()
