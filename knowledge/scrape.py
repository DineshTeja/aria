import requests

url = "https://api.firecrawl.dev/v1/crawl"

payload = {
    "url": "https://medlineplus.gov/healthtopics.html",
    "maxDepth": 123,
    "ignoreSitemap": True,
    "allowBackwardLinks": False,
    "allowExternalLinks": True,
    "scrapeOptions": {
        "formats": ["markdown"]
    }
}
headers = {
    "Authorization": "Bearer fc-72fa4228dd7e4eb4ad76b452f7a30d02",
    "Content-Type": "application/json"
}

response = requests.request("POST", url, json=payload, headers=headers)

with open("output.txt", "w") as file:
    file.write(response.text)