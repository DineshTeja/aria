"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Database } from "@/lib/types/schema";
import Navbar from "@/components/nav/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GeistSans } from "geist/font/sans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import _ from "lodash";
import { X, ArrowRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { Skeleton } from "@/components/ui/skeleton";

type Knowledge = Database["public"]["Tables"]["knowledge"]["Row"];

const categories = [
  "cardiovascular",
  "respiratory",
  "gastrointestinal",
  "neurological",
  "endocrine",
  "hematological",
  "infectious",
  "musculoskeletal",
  "autoimmune",
  "cancer",
];

export default function KnowledgePage() {
  const [knowledgeItems, setKnowledgeItems] = useState<Knowledge[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);
  const [isLoading, setIsLoading] = useState<boolean>(false);
//   const [searchTime, setSearchTime] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
//   const [totalCount, setTotalCount] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  const fetchKnowledgeItems = useCallback(async (reset: boolean = false) => {
    if (reset) {
      setSearchStartTime(performance.now());
      setIsLoading(true);
      setKnowledgeItems([]);
    //   setTotalCount(0);
      setPage(1);
    }

    const currentPage = reset ? 1 : page;
    const response = await fetch('/api/knowledge/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: debouncedQuery,
        selectedCategories,
        page: currentPage,
      }),
    });

    const result = await response.json();

    if (result.error) {
      console.error('Error fetching knowledge data:', result.error);
    } else {
      setKnowledgeItems(prevItems => reset ? result.data : [...prevItems, ...result.data]);
    //   setTotalCount(result.count);
      setHasMore(result.data.length === 50);
      setPage(prevPage => reset ? 2 : prevPage + 1);
    }

    // if (reset || currentPage === 1) {
    // //   const endTime = performance.now();
    // //   setSearchTime(endTime - (searchStartTime || endTime));
    // }

    setIsLoading(false);
  }, [debouncedQuery, selectedCategories, page, searchStartTime]);

  useEffect(() => {
    fetchKnowledgeItems(true);
  }, [debouncedQuery, selectedCategories]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      fetchKnowledgeItems();
    }
  };

  return (
    <Navbar>
      <main className="min-h-screen mx-auto max-w-7xl">
        <Card className="bg-card text-card-foreground h-full flex flex-col">
          <CardHeader className={`flex flex-col pb-1 ${GeistSans.className}`}>
            {/* Search Bar */}
            <Input
              type="text"
              placeholder="Search .."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Category Filters */}
            <div className="flex items-center pt-3">
              <div className="flex flex-wrap">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={
                      selectedCategories.includes(category) ? "default" : "outline"
                    }
                    className="mr-2 mb-2 cursor-pointer"
                    onClick={() => {
                      if (selectedCategories.includes(category)) {
                        setSelectedCategories(
                          selectedCategories.filter((c) => c !== category)
                        );
                      } else {
                        setSelectedCategories([...selectedCategories, category]);
                      }
                    }}
                  >
                    {_.startCase(category)}{" "}
                    {selectedCategories.includes(category) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className={`px-4 py-0 flex-grow ${GeistSans.className}`}>
            {/* <div className="text-md text-muted-foreground pb-2 px-2 flex items-center justify-between">
              {!isLoading && knowledgeItems.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {searchTime < 1000
                    ? `${searchTime.toFixed(0)} ms`
                    : `${(searchTime / 1000).toFixed(2)} s`}
                </span>
              )}
            </div> */}
            <ScrollArea className="h-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2 pb-6">
                {isLoading && knowledgeItems.length === 0 ? (
                  // Render Skeletons while loading
                  [...Array(6)].map((_, index) => (
                    <Skeleton key={index} className="h-40">
                      <Card className="rounded-lg shadow-md p-4 flex flex-col">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="h-6 bg-neutral-200 rounded w-32 mb-2"></CardTitle>
                            <Badge className="h-4 bg-neutral-200 rounded w-20"></Badge>
                          </div>
                          <Button variant="ghost" size="icon" disabled>
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </div>
                        <p className="text-sm bg-neutral-200 rounded h-4 mt-2"></p>
                        <p className="text-sm bg-neutral-200 rounded h-4 mt-1 w-3/4"></p>
                      </Card>
                    </Skeleton>
                  ))
                ) : (
                  // Render actual knowledge items
                  knowledgeItems.map((item) => (
                    <Card
                      key={item.id}
                      className={`rounded-lg shadow-md p-4 flex flex-col ${GeistSans.className}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold text-green-800">
                            {item.tag}
                          </CardTitle>
                          {item.category && (
                            <Badge variant="outline" className="mr-2">
                              {_.startCase(item.category)}
                            </Badge>
                          )}
                        </div>
                        <Link href={item.url || ""}>
                          <Button variant="ghost" size="icon">
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </div>
                      <p className={`text-sm text-muted-foreground mt-2 ${GeistSans.className}`}>
                        {item.summary.length > 100
                          ? `${item.summary.substring(0, 100)}...`
                          : item.summary}
                      </p>
                    </Card>
                  ))
                )}
              </div>
              {hasMore && !isLoading && (
                <div className="flex justify-center pb-6">
                  <Button onClick={loadMore}>
                    Load More
                  </Button>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </Navbar>
  );
}
