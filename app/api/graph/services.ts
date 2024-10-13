import "neo4j-driver";
// import { Neo4jGraph } from "@langchain/community/graphs/neo4j_graph";
import { ChatOpenAI } from "@langchain/openai";
import { LLMGraphTransformer } from '@langchain/community/experimental/graph_transformers/llm'
import { Document } from '@langchain/core/documents'

export const createGraphFromArticles = async (articles: string) => {
  const transformer = new LLMGraphTransformer({
    llm: new ChatOpenAI({
      modelName: "gpt-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
    }),
  });

  const doc = new Document({
    pageContent: articles,
  });

  const graphDocuments = await transformer.convertToGraphDocuments([doc])
  console.log("Graph created successfully");

  return graphDocuments[0];
};