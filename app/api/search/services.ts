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

export const searchKnowledgeBaseCategories = async (query: string, selectedCategories: string[], page: number = 1, pageSize: number = 50) => {
  try {
    let result;
    const offset = (page - 1) * pageSize;

    if (query) {
      // Existing code for handling non-empty query
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: query,
      });

      const embedding = response.data[0].embedding;

      result = await supabase.rpc("match_documents", {
        query_embedding: embedding,
        match_threshold: 0.25,
        match_count: pageSize,
      });
    } else {
      // Fetch documents conditional on selected categories with pagination
      result = await supabase
        .from('knowledge')
        .select('*', { count: 'exact' })
        .in('category', selectedCategories)
        .range(offset, offset + pageSize - 1);
    }

    if (result.error) {
      return { data: null, error: result.error, count: 0 };
    }

    const filteredData = query
      ? result.data?.filter(item => selectedCategories.includes(item.category || ''))
      : result.data;

    return { 
      data: filteredData, 
      error: null, 
      count: result.count || filteredData?.length || 0
    };
  } catch (error) {
    return { data: null, error, count: 0 };
  }
};

export const searchPhysicians = async (query: string, state: string, page: number = 1, pageSize: number = 20) => {
  try {
    const offset = (page - 1) * pageSize;
    let supabaseQuery = supabase
      .from('new_doctors')
      .select('*', { count: 'exact', head: false })
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .range(offset, offset + pageSize - 1);

    if (state) {
      supabaseQuery = supabaseQuery.eq('region', state);
    }

    const { data, error, count } = await supabaseQuery;

    if (error) {
      return { data: null, error, count: 0 };
    }

    const uniqueData = Array.from(
      new Map(data.map(item => [item.link, item])).values()
    );
    
    return { data: uniqueData, error: null, count };
  } catch (error) {
    return { data: null, error, count: 0 };
  }
};
