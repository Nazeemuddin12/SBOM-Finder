import requests
import concurrent.futures

# GitHub Search API endpoint used by both fetch_from_github and search_github
GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"


def fetch_from_github(product_name: str):
    # Used when a user adds a tracked product — finds the single best matching repo
    try:
        response = requests.get(
            GITHUB_SEARCH_URL,
            params={"q": product_name, "sort": "stars", "order": "desc", "per_page": 1},
            headers={"Accept": "application/vnd.github+json"},
            timeout=8,
        )

        # 403 means GitHub rate limit hit — fail silently, tracking is best effort
        if response.status_code == 403:
            return None

        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])

        if not items:
            return None

        top = items[0]
        return {
            "source_type": "github",
            "source_title": top.get("full_name"),   # e.g. "owner/repo-name"
            "source_url": top.get("html_url"),
            "confidence": "0.70",                    # heuristic — not a guaranteed match
            "description": top.get("description"),
        }
    except Exception:
        return None


def search_npm(query: str, per_page: int = 4):
    # Searches the npm registry using their relevance-scored search endpoint
    try:
        response = requests.get(
            "https://registry.npmjs.org/-/v1/search",
            params={"text": query, "size": per_page},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for obj in data.get("objects", []):
            pkg = obj.get("package", {})
            results.append({
                "name": pkg.get("name"),
                "full_name": pkg.get("name"),
                "url": pkg.get("links", {}).get("npm") or f"https://www.npmjs.com/package/{pkg.get('name')}",
                "description": pkg.get("description") or "npm package.",
                "owner": pkg.get("publisher", {}).get("username") or pkg.get("scope"),
                "stars": obj.get("score", {}).get("detail", {}).get("popularity", 0),  # popularity score as proxy for stars
                "source": "npm",
                "version": pkg.get("version"),
                "license": pkg.get("links", {}).get("repository"),
            })
        return results
    except Exception:
        return []


def search_pypi(query: str, per_page: int = 4):
    # PyPI has no proper search JSON API so we do an exact name lookup instead.
    # Only returns a result if the query exactly matches a package name.
    try:
        exact = requests.get(
            f"https://pypi.org/pypi/{query}/json",
            timeout=8,
        )
        results = []
        if exact.status_code == 200:
            pkg = exact.json()
            info = pkg.get("info", {})
            results.append({
                "name": info.get("name"),
                "full_name": info.get("name"),
                "url": info.get("project_url") or f"https://pypi.org/project/{info.get('name')}",
                "description": info.get("summary") or "PyPI package.",
                "owner": info.get("author"),
                "stars": 0,
                "source": "PyPI",
                "version": info.get("version"),
                "license": info.get("license"),
            })
        return results
    except Exception:
        return []


def search_maven(query: str, per_page: int = 4):
    # Searches Maven Central using their Solr-based API
    # Returns groupId:artifactId coordinates as the full_name
    try:
        response = requests.get(
            "https://search.maven.org/solrsearch/select",
            params={"q": query, "rows": per_page, "wt": "json"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for doc in data.get("response", {}).get("docs", []):
            artifact_id = doc.get("a")
            group_id = doc.get("g")
            version = doc.get("latestVersion")
            results.append({
                "name": artifact_id,
                "full_name": f"{group_id}:{artifact_id}",  # standard Maven coordinates
                "url": f"https://search.maven.org/artifact/{group_id}/{artifact_id}",
                "description": f"Maven artifact: {group_id}:{artifact_id}",
                "owner": group_id,
                "stars": doc.get("versionCount", 0),  # version count as a rough popularity proxy
                "source": "Maven Central",
                "version": version,
                "license": None,
            })
        return results
    except Exception:
        return []


def search_github(query: str, per_page: int = 4):
    # Used as part of smart search fallback — returns multiple repos sorted by stars
    try:
        response = requests.get(
            GITHUB_SEARCH_URL,
            params={"q": query, "sort": "stars", "order": "desc", "per_page": per_page},
            headers={"Accept": "application/vnd.github+json"},
            timeout=8,
        )

        # 403 = rate limited — return empty list rather than crashing the whole search
        if response.status_code == 403:
            return []

        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("items", []):
            results.append({
                "name": item.get("name"),
                "full_name": item.get("full_name"),
                "url": item.get("html_url"),
                "description": item.get("description") or "GitHub repository.",
                "owner": item.get("owner", {}).get("login"),
                "stars": item.get("stargazers_count"),
                "source": "GitHub",
                "version": None,
                "license": item.get("license", {}).get("spdx_id") if item.get("license") else None,
            })
        return results
    except Exception:
        return []


def search_nuget(query: str, per_page: int = 3):
    # Searches the NuGet gallery for .NET packages
    try:
        response = requests.get(
            "https://azuresearch-usnc.nuget.org/query",
            params={"q": query, "take": per_page},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for pkg in data.get("data", []):
            results.append({
                "name": pkg.get("id"),
                "full_name": pkg.get("id"),
                "url": f"https://www.nuget.org/packages/{pkg.get('id')}",
                "description": pkg.get("description") or "NuGet package.",
                "owner": pkg.get("authors", [""])[0] if pkg.get("authors") else "",
                "stars": pkg.get("totalDownloads", 0),  # total downloads as popularity proxy
                "source": "NuGet",
                "version": pkg.get("version"),
                "license": None,
            })
        return results
    except Exception:
        return []


def search_rubygems(query: str, per_page: int = 3):
    # Searches RubyGems for Ruby gems
    try:
        response = requests.get(
            "https://rubygems.org/api/v1/search.json",
            params={"query": query},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for gem in data[:per_page]:
            results.append({
                "name": gem.get("name"),
                "full_name": gem.get("name"),
                "url": gem.get("project_uri") or f"https://rubygems.org/gems/{gem.get('name')}",
                "description": gem.get("info") or "RubyGems package.",
                "owner": gem.get("authors"),
                "stars": gem.get("downloads", 0),
                "source": "RubyGems",
                "version": gem.get("version"),
                "license": gem.get("licenses", [None])[0] if gem.get("licenses") else None,
            })
        return results
    except Exception:
        return []


def search_external_products(query: str):
    # Runs all registry searches in parallel so the total wait time is the
    # slowest single registry rather than the sum of all of them.
    all_results = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as executor:
        futures = {
            executor.submit(search_npm, query, 4): "npm",
            executor.submit(search_pypi, query, 2): "pypi",
            executor.submit(search_maven, query, 3): "maven",
            executor.submit(search_github, query, 4): "github",
            executor.submit(search_nuget, query, 3): "nuget",
            executor.submit(search_rubygems, query, 3): "rubygems",
        }

        for future in concurrent.futures.as_completed(futures):
            try:
                results = future.result(timeout=10)
                all_results.extend(results)
            except Exception:
                pass  # if one registry fails or times out, continue with the rest

    # Deduplicate by lowercase package name so the same package from two
    # sources doesn't appear twice in the results
    seen = set()
    unique = []
    for r in all_results:
        key = (r.get("name") or "").lower().strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(r)

    # Exact name matches float to the top, rest sorted by stars descending
    query_lower = query.lower()
    exact = [r for r in unique if (r.get("name") or "").lower() == query_lower]
    partial = [r for r in unique if (r.get("name") or "").lower() != query_lower]
    partial.sort(key=lambda x: x.get("stars") or 0, reverse=True)

    # Cap at 12 results to keep the UI response manageable
    return (exact + partial)[:12]