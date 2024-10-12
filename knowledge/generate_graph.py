import os

import getpass
from langchain_community.graphs import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_core.documents import Document

os.environ["OPENAI_API_KEY"] = getpass.getpass("Enter your OpenAI API key: ")
os.environ["NEO4J_URI"] = "neo4j+s://dadb9d47.databases.neo4j.io:7687"
os.environ["NEO4J_USERNAME"] = "neo4j"
os.environ["NEO4J_PASSWORD"] = getpass.getpass("Enter your neo4j password ")

graph = Neo4jGraph()

# llm = ChatGoogleGenerativeAI(model="gemini-1.5-pro", temperature=0)
llm = ChatOpenAI(temperature=0, model_name="gpt-4o-mini")

llm_transformer = LLMGraphTransformer(llm=llm)

with open('text.txt') as file:
  content = file.read()

documents = [Document(page_content=article) for article in content.split("\n\n")]
# documents = [Document(page_content=a)]
graph_documents = llm_transformer.convert_to_graph_documents([documents[0]])

print(f"Nodes:{graph_documents[0].nodes}")
print(f"Relationships:{graph_documents[0].relationships}")

graph.add_graph_documents(
  graph_documents
)