import os
from groq import Groq

# Initialize the Groq client with the API key from environment variables
client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)

def chat_with_model(prompt):
    # Create a chat completion request
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": prompt,
            }
        ],
        model="llama3-8b-8192", 
    )

    return chat_completion.choices[0].message.content

if __name__ == "__main__":
    user_input = input("You: ")
    response = chat_with_model(user_input)
    print(f"Model: {response}")
