from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import os
import supabase
from dotenv import load_dotenv
from multiprocessing import Pool


# Function to scrape a single specialty
def scrape_specialty(specialty):
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    
    specialty_name, specialty_url = specialty
    driver.get(specialty_url)

    all_doctors = []
    
    while True:
        doctors = driver.find_elements(By.XPATH, "//a[contains(text(), ', MD')]")    
        for doctor in doctors:
            doctor_name = doctor.text
            doctor_link = doctor.get_attribute('href')
            all_doctors.append(f"{doctor_name} {doctor_link}")
        
        # Click next button to go to the next page
        try:
            next_button = driver.find_element(By.LINK_TEXT, 'Next')
            next_button.click()
        except:
            break  # No more pages

    driver.quit()

    # Save results to a text file (one for each specialty)
    with open(f'doctors_{specialty_name}.txt', 'w') as file:
        for doctor in all_doctors:
            file.write(f"{doctor}\n")


# Load environment variables
load_dotenv("../../.env.local")
supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
supabase_key = os.getenv("NEXT_PUBLIC_SUPABASE_KEY")
supabase_client = supabase.create_client(supabase_url, supabase_key)

# List of specialties and their URLs
specialties_urls = [
    ["Allergy & Immunology", "https://www.doximity.com/directory/md/specialty/allergy-immunology"],
    ["Anesthesiology", "https://www.doximity.com/directory/md/specialty/anesthesiology"],
    ["Cardiology", "https://www.doximity.com/directory/md/specialty/cardiology"],
    ["Certified Registered Nurse Anesthetist", "https://www.doximity.com/directory/md/specialty/certified-registered-nurse-anesthetist"],
    ["Child Neurology", "https://www.doximity.com/directory/md/specialty/child-neurology"],
    ["Colon & Rectal Surgery", "https://www.doximity.com/directory/md/specialty/colon-rectal-surgery"],
    ["Dermatology", "https://www.doximity.com/directory/md/specialty/dermatology"],
    ["Emergency Medicine", "https://www.doximity.com/directory/md/specialty/emergency-medicine"],
    ["Endocrinology", "https://www.doximity.com/directory/md/specialty/endocrinology"],
    ["Family Medicine", "https://www.doximity.com/directory/md/specialty/family-medicine"],
    ["Gastroenterology", "https://www.doximity.com/directory/md/specialty/gastroenterology"],
    ["General Surgery", "https://www.doximity.com/directory/md/specialty/general-surgery"],
    ["Geriatrics", "https://www.doximity.com/directory/md/specialty/geriatrics"],
    ["Hematology", "https://www.doximity.com/directory/md/specialty/hematology"],
    ["Infectious Disease", "https://www.doximity.com/directory/md/specialty/infectious-disease"],
    ["Internal Medicine", "https://www.doximity.com/directory/md/specialty/internal-medicine"],
    ["Interventional Radiology", "https://www.doximity.com/directory/md/specialty/interventional-radiology"],
    ["Medical Genetics", "https://www.doximity.com/directory/md/specialty/medical-genetics"],
    ["Medicine/Pediatrics", "https://www.doximity.com/directory/md/specialty/medicine%2Fpediatrics"],
    ["Neonat/Perinatology", "https://www.doximity.com/directory/md/specialty/neonat%2Fperinatology"],
    ["Nephrology", "https://www.doximity.com/directory/md/specialty/nephrology"],
    ["Neurology", "https://www.doximity.com/directory/md/specialty/neurology"],
    ["Neurosurgery", "https://www.doximity.com/directory/md/specialty/neurosurgery"],
    ["Nuclear Medicine", "https://www.doximity.com/directory/md/specialty/nuclear-medicine"],
    ["Obstetrics & Gynecology", "https://www.doximity.com/directory/md/specialty/obstetrics-gynecology"],
    ["Occupational Medicine", "https://www.doximity.com/directory/md/specialty/occupational-medicine"],
    ["Oncology", "https://www.doximity.com/directory/md/specialty/oncology"],
    ["Ophthalmology", "https://www.doximity.com/directory/md/specialty/ophthalmology"],
    ["Oral & Maxillofacial Surgery", "https://www.doximity.com/directory/md/specialty/oral-maxillofacial-surgery"],
    ["Orthopaedic Surgery", "https://www.doximity.com/directory/md/specialty/orthopaedic-surgery"],
    ["Other MD/DO", "https://www.doximity.com/directory/md/specialty/other-md%2Fdo"],
    ["Otolaryngology (ENT)", "https://www.doximity.com/directory/md/specialty/otolaryngology-ent"],
    ["Pathology", "https://www.doximity.com/directory/md/specialty/pathology"],
    ["Pediatric (General) Surgery", "https://www.doximity.com/directory/md/specialty/pediatric-surgery"],
    ["Pediatric Cardiology", "https://www.doximity.com/directory/md/specialty/pediatric-cardiology"],
    ["Pediatric Emergency Medicine", "https://www.doximity.com/directory/md/specialty/pediatric-emergency-medicine"],
    ["Pediatric Endocrinology", "https://www.doximity.com/directory/md/specialty/pediatric-endocrinology"],
    ["Pediatric Gastroenterology", "https://www.doximity.com/directory/md/specialty/pediatric-gastroenterology"],
    ["Pediatric Hematology & Oncology", "https://www.doximity.com/directory/md/specialty/pediatric-hematology-oncology"],
    ["Pediatric Infectious Disease", "https://www.doximity.com/directory/md/specialty/pediatric-infectious-disease"],
    ["Pediatric Nephrology", "https://www.doximity.com/directory/md/specialty/pediatric-nephrology"],
    ["Pediatric Pulmonology", "https://www.doximity.com/directory/md/specialty/pediatric-pulmonology"],
    ["Pediatric Rheumatology", "https://www.doximity.com/directory/md/specialty/pediatric-rheumatology"],
    ["Pediatrics", "https://www.doximity.com/directory/md/specialty/pediatrics"],
    ["Physical Medicine/Rehab", "https://www.doximity.com/directory/md/specialty/physical-medicine%2Frehab"],
    ["Plastic Surgery", "https://www.doximity.com/directory/md/specialty/plastic-surgery"],
    ["Preventive Medicine", "https://www.doximity.com/directory/md/specialty/preventive-medicine"],
    ["Psychiatry", "https://www.doximity.com/directory/md/specialty/psychiatry"],
    ["Pulmonology", "https://www.doximity.com/directory/md/specialty/pulmonology"],
    ["Radiation Oncology", "https://www.doximity.com/directory/md/specialty/radiation-oncology"],
    ["Radiology", "https://www.doximity.com/directory/md/specialty/radiology"],
    ["Research", "https://www.doximity.com/directory/md/specialty/research"],
    ["Resident Physician", "https://www.doximity.com/directory/md/specialty/resident-physician"],
    ["Rheumatology", "https://www.doximity.com/directory/md/specialty/rheumatology"],
    ["Thoracic Surgery", "https://www.doximity.com/directory/md/specialty/thoracic-surgery"],
    ["Urology", "https://www.doximity.com/directory/md/specialty/urology"],
    ["Vascular Surgery", "https://www.doximity.com/directory/md/specialty/vascular-surgery"]
]

# Use multiprocessing to scrape all specialties in parallel
if __name__ == "__main__":
    with Pool(processes=len(specialties_urls)) as pool:
        pool.map(scrape_specialty, specialties_urls)