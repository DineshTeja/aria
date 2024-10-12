import requests
import json
from pydantic import BaseModel, Field

import os
from bs4 import BeautifulSoup

def scrape_topic_summaries():
    with open('output.txt', 'r') as url_file, open('text.txt', 'w') as text_file:
        for url in url_file:
            url = url.strip()
            try:
                response = requests.get(url)
                response.raise_for_status()
                soup = BeautifulSoup(response.text, 'html.parser')
                topic_summary = soup.find('div', id='topic-summary')
                
                if topic_summary:
                    # Extract text including hyperlink text
                    summary_text = topic_summary.get_text(separator=' ', strip=True)
                    text_file.write(summary_text + '\n\n')
                else:
                    print(f"No topic summary found for URL: {url}")
            except requests.RequestException as e:
                print(f"Error fetching URL {url}: {e}")

if __name__ == "__main__":
    scrape_topic_summaries()
