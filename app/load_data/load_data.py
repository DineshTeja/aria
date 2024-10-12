from typing import Optional
import openai
from openai import OpenAI
import supabase
from dotenv import load_dotenv
import os
from enum import Enum
from pydantic import BaseModel
import multiprocessing
from tqdm import tqdm
from tenacity import retry, stop_after_attempt, wait_exponential

load_dotenv("../../.env.local")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


class Category(str, Enum):
    CATEGORY_ONE = "cardiovascular"
    CATEGORY_TWO = "respiratory"
    CATEGORY_THREE = "endocrine"
    CATEGORY_FOUR = "gastrointestinal"
    CATEGORY_FIVE = "hematological"
    CATEGORY_SIX = "infectious"
    CATEGORY_SEVEN = "musculoskeletal"
    CATEGORY_EIGHT = "autoimmune"
    CATEGORY_NINE = "cancer"
    CATEGORY_TEN = "neurological"


class ConceptDetails(BaseModel):
    title: str
    summary: str
    category: Category


@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
def generate_concept_details(paragraph):
    prompt = f"Provide a title, summary, and category for the following medical concept:\n\n{paragraph} Pick between the following options for the category you decide: Cardiovascular, Respiratory, Gastrointestinal, Endocrine, Hematological, Infectious, Musculoskeletal, Autoimmune, Cancer, Neurological."

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini-2024-07-18",
        messages=[{"role": "system", "content": prompt}],
        response_format=ConceptDetails,
    )

    return completion.choices[0].message.parsed


@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
def get_embedding(text, model="text-embedding-3-small"):
    text = text.replace("\n", " ")
    return client.embeddings.create(input=[text], model=model).data[0].embedding


# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
supabase_client = supabase.create_client(supabase_url, supabase_key)


@retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=4, max=10))
def save_to_supabase(title, summary, paragraph, embedding, category):
    data = {
        "tag": title,
        "summary": summary,
        "article": paragraph,
        "embedding": embedding,
        "category": category,
    }

    response = supabase_client.table("knowledge").insert(data).execute()
    return response


def process_paragraph(paragraph):
    obj = generate_concept_details(paragraph)
    embedding = get_embedding(paragraph)
    return obj.title, obj.summary, paragraph, embedding, obj.category


if __name__ == "__main__":

    with open("text.txt", "r") as file:
        paragraphs = [line.strip() for line in file if line.strip()]

    with tqdm(total=len(paragraphs), desc="Processing paragraphs") as pbar:

        def update_progress(result):
            pbar.update(1)
            if result is None:
                return
            title, summary, paragraph, embedding, category = result
            save_to_supabase(title, summary, paragraph, embedding, category)

        with multiprocessing.Pool(multiprocessing.cpu_count()) as pool:
            for paragraph in paragraphs:
                pool.apply_async(
                    process_paragraph, args=(paragraph,), callback=update_progress
                )

            pool.close()
            pool.join()
