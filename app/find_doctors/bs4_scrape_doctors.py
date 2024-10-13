import json
from pydantic import BaseModel, HttpUrl
import os
import requests
from bs4 import BeautifulSoup
from tqdm import tqdm
import multiprocessing as mp
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../../.env.local")

supabase = create_client(
    os.getenv("NEXT_PUBLIC_SUPABASE_URL"), os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
)


class DoctorFromFile(BaseModel):
    name: str
    link: HttpUrl


class DoctorFromSite(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    credentials: str | None = None
    link: HttpUrl
    locality: str | None = None
    locality_url: HttpUrl | None = None
    region: str | None = None
    region_url: HttpUrl | None = None
    speciality: str | None = None
    speciality_link: HttpUrl | None = None
    photo_url: HttpUrl | None = None


def get_doctor_from_site(doctor: DoctorFromFile) -> DoctorFromSite | None:
    try:
        site = requests.get(doctor.link)
        if site.status_code != 200:
            print(f"Failed to fetch {doctor.link}. Status code: {site.status_code}")
            return None
        soup = BeautifulSoup(site.text, "html.parser")
        doctor_data = {"link": doctor.link}

        base_url = "https://www.doximity.com{relative_link}"

        first_name_elem = soup.find("span", class_="user-name-first")
        if first_name_elem:
            doctor_data["first_name"] = first_name_elem.text.strip()

        last_name_elem = soup.find("span", class_="user-name-last")
        if last_name_elem:
            doctor_data["last_name"] = last_name_elem.text.strip()

        credentials_elem = soup.find("span", class_="user-name-credentials")
        if credentials_elem:
            doctor_data["credentials"] = credentials_elem.text.strip()

        speciality_elem = soup.find("a", class_="profile-head-subtitle")
        if speciality_elem:
            doctor_data["speciality"] = speciality_elem.text.strip()
            doctor_data["speciality_link"] = base_url.format(
                relative_link=speciality_elem.get("href")
            )

        locality_elem = soup.find("span", attrs={"itemprop": "addressLocality"})
        if locality_elem:
            doctor_data["locality"] = locality_elem.text.strip()
            locality_link_elem = locality_elem.find("a")
            if locality_link_elem:
                doctor_data["locality_url"] = base_url.format(
                    relative_link=locality_link_elem.get("href")
                )

        region_elem = soup.find("span", attrs={"itemprop": "addressRegion"})
        if region_elem:
            doctor_data["region"] = region_elem.text.strip()
            region_link_elem = region_elem.find("a")
            if region_link_elem:
                doctor_data["region_url"] = base_url.format(
                    relative_link=region_link_elem.get("href")
                )

        photo_elem = soup.find("div", class_="profile-photo")
        if photo_elem:
            photo_link_elem = photo_elem.find("img")
            if photo_link_elem:
                doctor_data["photo_url"] = photo_link_elem.get("src")

        speciality_elem = soup.find("a", class_="profile-head-subtitle")
        if speciality_elem:
            relative_link = speciality_elem.get("href")
            if relative_link:
                doctor_data["speciality_link"] = base_url.format(
                    relative_link=relative_link
                )

        # Remove unicode characters from non-link values
        for key, value in doctor_data.items():
            if (
                isinstance(value, str)
                and not key.endswith("_url")
                and not key.endswith("_link")
            ):
                doctor_data[key] = "".join(
                    char for char in value if ord(char) < 128
                ).strip()

        return DoctorFromSite(**doctor_data)
    except Exception as e:
        print(f"An error occurred: {e}")
        return None


if __name__ == "__main__":
    doctors: list[DoctorFromFile] = []
    doc_dir = "doc_dir"

    list_of_doctors_from_site: list[DoctorFromSite] = []

    for filename in os.listdir(doc_dir):
        if filename.startswith("doctors_") and filename.endswith(".txt"):
            file_path = os.path.join(doc_dir, filename)
            with open(file_path, "r") as file:
                for line in file:
                    doctor_name, doctor_link = line.strip().split(", ", 1)
                    doctor_link = "https://" + doctor_link.split(" https://", 1)[1]
                    doctors.append(DoctorFromFile(name=doctor_name, link=doctor_link))

    with tqdm(total=len(doctors), desc="Scraping doctor information") as pbar:

        def upload_doctor(doctor: DoctorFromSite | None):
            if doctor:
                supabase.table("new_doctors").insert(
                    doctor.model_dump(mode="json")
                ).execute()
            pbar.update(1)

        with mp.Pool(mp.cpu_count()) as pool:
            for doctor in doctors:
                pool.apply_async(
                    get_doctor_from_site, args=(doctor,), callback=upload_doctor
                )
            pool.close()
            pool.join()
