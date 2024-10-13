import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from supabase import create_client
import multiprocessing
from multiprocessing import Pool
import supabase

# Set up Supabase client
from dotenv import load_dotenv
load_dotenv("../../.env.local")

supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
supabase_client = supabase.create_client(supabase_url, supabase_key)

# Define the number of worker processes (set according to your system capabilities)
NUM_WORKERS = 1

# Define the function to process each doctor's data
def process_doctor(doctor_info):
    doctor_name, doctor_link = doctor_info
    # Set up the Selenium WebDriver in each worker process
    driver = webdriver.Chrome()  # Modify this if needed to point to your driver path

    # Visit doctor detail page
    driver.get(doctor_link)
    
    try:
        city_element = driver.find_element(By.CSS_SELECTOR, 'span[itemprop="addressLocality"]')
        state_element = driver.find_element(By.CSS_SELECTOR, 'span[itemprop="addressRegion"]')
        speciality_element = driver.find_element(By.CSS_SELECTOR, 'a.profile-head-subtitle')
        
        subspecialty_text = ""
        job_title_text = ""

        # Try to find the subspecialty
        try:
            subspecialty_element = driver.find_element(By.CSS_SELECTOR, 'p.user-subspecialty')
            subspecialty_text = subspecialty_element.text
        except:
            pass

        # Try to find the job title
        try:
            job_title_element = driver.find_element(By.CSS_SELECTOR, 'p.user-job-title[itemprop="jobTitle"]')
            job_title_text = job_title_element.text
        except:
            pass

        # Combine subspecialty and job title
        combined_text = f"{subspecialty_text}, {job_title_text}" if subspecialty_text and job_title_text else subspecialty_text or job_title_text

        # Save the data to Supabase
        supabase_client.table('doctors').insert({
            'name': doctor_name,
            'city': city_element.text,
            'state': state_element.text,
            'specialty': speciality_element.text,
            'bio': combined_text
        }).execute()
    finally:
        driver.quit()

# Define a function to parse a file and return doctor data
def parse_file(file_path):
    doctor_data = []
    with open(file_path, 'r') as file:
        for line in file:
            if line.strip():
                parts = line.split(' ')
                doctor_name = " ".join(parts[:-1])
                doctor_link = parts[-1]
                doctor_data.append((doctor_name, doctor_link))
    return doctor_data

# Function to process all files and prepare doctor data for multiprocessing
def process_files_in_directory(files_directory):
    all_doctor_data = []
    for filename in os.listdir(files_directory):
        file_path = os.path.join(files_directory, filename)
        all_doctor_data.extend(parse_file(file_path))
    return all_doctor_data

# Main function to handle multiprocessing
def main():
    files_directory = "doc_dir"  # Set this to the folder where your files are located
    
    # Collect all doctor data from the files
    doctor_data = process_files_in_directory(files_directory)

    # Use a pool of workers to process each doctor in parallel
    with Pool(NUM_WORKERS) as pool:
        pool.map(process_doctor, doctor_data)

if __name__ == "__main__":
    main()
