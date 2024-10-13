import json
import multiprocessing as mp
from tqdm import tqdm
from supabase import create_client
from dotenv import load_dotenv
import os

load_dotenv("../../.env.local")

supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
)

with open("scraped_doctors.json", "r") as file:
    doctors = json.load(file)

if __name__ == "__main__":
    with mp.Pool(mp.cpu_count()) as pool:
        list(
            tqdm(
                pool.imap(
                    lambda doctor: supabase.table("doctors").insert(doctor).execute(),
                    doctors,
                ),
                total=len(doctors),
                desc="Uploading doctors to database",
            )
        )
