import { supabase } from "@/lib/utils";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const searchKnowledgeBase = async (query: string) => {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const embedding = response.data[0].embedding;
  return await supabase.rpc("match_documents", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 5,
  });
};

export const searchKnowledgeBaseCategories = async (query: string, selectedCategories: string[]) => {
  try {
    if (query) {
      // Existing code for handling non-empty query
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });

      const embedding = response.data[0].embedding;

      const result = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.25,
        match_count: 50,
      });

      const filteredData = result.data?.filter(item =>
        selectedCategories.includes(item.category)
      );

      return { data: filteredData, error: null };
    } else {
      // Fetch all documents conditional on selected categories
      const { data, error } = await supabase
        .from('knowledge')
        .select('*')
        .in('category', selectedCategories);

      if (error) {
        return { data: null, error };
      }

      return { data, error: null };
    }
  } catch (error) {
    return { data: null, error };
  }
};
