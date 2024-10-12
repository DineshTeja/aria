import os
from groq import Groq
from typing import List, Dict, Tuple

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

def chat_with_model(messages: List[Dict[str, str]]) -> str:
    chat_completion = client.chat.completions.create(
        messages=messages,
        model="llama3-8b-8192",
        temperature=0.7,
        max_tokens=1000,
    )
    return chat_completion.choices[0].message.content

def ai_doctor_pipeline(patient_input: str) -> Tuple[str, bool]:
    system_prompt = """
    You are an AI doctor tasked with analyzing a patient's description of their symptoms and concerns. Based on the information provided, you should:

    1. Analyze the patient's input and identify key symptoms and concerns.
    2. Determine if you have enough information to suggest a potential diagnosis.
    3. If you have enough information:
       - Provide a summary of your findings and a potential diagnosis.
       - Recommend next steps or further actions for the patient.
    4. If you don't have enough information:
       - Explain why more information is needed.
       - Suggest specific questions or areas where more details would be helpful.

    At the end of your response, include one of these tags:
    [DIAGNOSIS_PROVIDED] if you were able to provide a potential diagnosis.
    [MORE_INFO_NEEDED] if you need more information to make a diagnosis.

    Remember to be professional, empathetic, and thorough in your assessment. Do not provide definitive medical advice or prescriptions, and always recommend consulting with a human healthcare professional for confirmation and treatment.
    """

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": patient_input},
    ]

    response = chat_with_model(messages)
    
    # Check for diagnosis status
    has_diagnosis = "[DIAGNOSIS_PROVIDED]" in response
    
    # Remove the status tag from the response
    response_content = response.replace("[DIAGNOSIS_PROVIDED]", "").replace("[MORE_INFO_NEEDED]", "").strip()

    return response_content, has_diagnosis

if __name__ == "__main__":
    patient_description = input("Patient, please describe your symptoms and concerns: ")
    response, has_diagnosis = ai_doctor_pipeline(patient_description)
    print("\nAI Doctor's Response:")
    print(response)
    print(f"\nDiagnosis provided: {'Yes' if has_diagnosis else 'No'}")
