import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request


TITLE_RE = re.compile(
    r'<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>(.*?)</a>',
    re.IGNORECASE | re.DOTALL,
)
SNIPPET_RE = re.compile(
    r'<(?:a|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</(?:a|div)>',
    re.IGNORECASE | re.DOTALL,
)
TAG_RE = re.compile(r"<[^>]+>")
WHITESPACE_RE = re.compile(r"\s+")


def configure_stdio():
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8")


def clean_text(value):
    text = TAG_RE.sub(" ", value or "")
    text = html.unescape(text)
    return WHITESPACE_RE.sub(" ", text).strip()


def resolve_ddg_url(raw_url):
    if not raw_url:
        return ""

    raw_url = html.unescape(raw_url)
    if raw_url.startswith("//"):
        raw_url = "https:" + raw_url
    elif raw_url.startswith("/"):
        raw_url = "https://duckduckgo.com" + raw_url

    parsed = urllib.parse.urlparse(raw_url)
    if parsed.netloc.endswith("duckduckgo.com") and parsed.path.startswith("/l/"):
        query = urllib.parse.parse_qs(parsed.query)
        uddg = query.get("uddg", [])
        if uddg:
            return urllib.parse.unquote(uddg[0])

    return raw_url


def fetch_html(query):
    payload = urllib.parse.urlencode({"q": query}).encode("utf-8")
    request = urllib.request.Request(
        "https://html.duckduckgo.com/html/",
        data=payload,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/123.0.0.0 Safari/537.36"
            ),
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return response.read().decode("utf-8", errors="replace")


def parse_results(page_html, count):
    title_matches = TITLE_RE.findall(page_html)
    snippet_matches = SNIPPET_RE.findall(page_html)
    results = []
    seen_urls = set()

    for index, match in enumerate(title_matches):
        if len(results) >= count:
            break

        raw_url, raw_title = match
        url = resolve_ddg_url(raw_url)
        title = clean_text(raw_title)
        snippet = clean_text(snippet_matches[index]) if index < len(snippet_matches) else ""

        if not url or not title or url in seen_urls:
            continue

        hostname = urllib.parse.urlparse(url).hostname or ""
        seen_urls.add(url)
        results.append(
            {
                "title": title,
                "url": url,
                "snippet": snippet,
                "site_name": hostname,
            }
        )

    return results


def main():
    configure_stdio()

    payload = json.loads(sys.stdin.read() or "{}")
    queries = payload.get("queries") or []
    count = int(payload.get("count") or 10)

    all_items = []
    errors = []

    for index, query in enumerate(queries):
        if not isinstance(query, str) or not query.strip():
            continue

        try:
            page_html = fetch_html(query.strip())
            all_items.extend(parse_results(page_html, count))
        except Exception as error:
            errors.append(f"{query}: {error}")

        if index < len(queries) - 1:
            time.sleep(1)

    print(
        json.dumps(
            {
                "success": True,
                "web_items": all_items,
                "errors": errors,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()
