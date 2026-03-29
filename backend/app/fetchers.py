import requests


GITHUB_SEARCH_URL = "https://api.github.com/search/repositories"


def fetch_from_github(product_name: str):
    try:
        response = requests.get(
            GITHUB_SEARCH_URL,
            params={"q": product_name, "sort": "stars", "order": "desc", "per_page": 1},
            headers={"Accept": "application/vnd.github+json"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        items = data.get("items", [])
        if not items:
            return None

        top = items[0]

        return {
            "source_type": "github",
            "source_title": top.get("full_name"),
            "source_url": top.get("html_url"),
            "confidence": "0.70",
            "description": top.get("description"),
        }
    except Exception:
        return None


def search_external_products(query: str):
    try:
        response = requests.get(
            GITHUB_SEARCH_URL,
            params={"q": query, "sort": "stars", "order": "desc", "per_page": 5},
            headers={"Accept": "application/vnd.github+json"},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for item in data.get("items", []):
            results.append(
                {
                    "name": item.get("name"),
                    "full_name": item.get("full_name"),
                    "url": item.get("html_url"),
                    "description": item.get("description"),
                    "owner": item.get("owner", {}).get("login"),
                    "stars": item.get("stargazers_count"),
                    "source": "GitHub",
                }
            )

        return results
    except Exception:
        return []