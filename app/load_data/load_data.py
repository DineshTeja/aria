import openai
from openai import OpenAI
import supabase
from dotenv import load_dotenv
import os
from enum import Enum
from pydantic import BaseModel

load_dotenv("../../.env.local")
client = OpenAI(
    api_key = os.getenv("OPENAI_API_KEY")
)


with open('text.txt', 'r') as file:
    paragraphs = [line.strip() for line in file if line.strip()]


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



def generate_concept_details(paragraph):
    prompt = f"Provide a title, summary, and category for the following medical concept:\n\n{paragraph} Pick between the following options for the category you decide: Cardiovascular, Respiratory, Gastrointestinal, Endocrine, Hematological, Infectious, Musculoskeletal, Autoimmune, Cancer, Neurological."

    completion = client.beta.chat.completions.parse(
        model="gpt-4o-mini-2024-07-18",
        messages=[
            {"role": "system", "content": prompt}
        ],
        response_format=ConceptDetails
    )
    
    return completion.choices[0].message.parsed

def get_embedding(text, model="text-embedding-3-small"):
   text = text.replace("\n", " ")
   return client.embeddings.create(input = [text], model=model).data[0].embedding


# Initialize Supabase client
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
supabase_client = supabase.create_client(supabase_url, supabase_key)

def save_to_supabase(title, summary, paragraph, embedding, category):
    data = {
        "tag": title,
        "summary": summary,
        "article": paragraph,
        "embedding": embedding,
        "category": category
    }
    
    response = supabase_client.table('knowledge').insert(data).execute()
    return response

for paragraph in paragraphs:
    obj = generate_concept_details(paragraph)

    embedding = get_embedding(paragraph)
    response = save_to_supabase(obj.title, obj.summary, paragraph, embedding, obj.category)
