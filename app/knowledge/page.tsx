"use client";

import React, { useEffect, useState } from "react";
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
  const [debouncedQuery] = useDebounce(searchQuery, 300); // Debounce to limit API calls
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Add state to store the search time
  const [searchTime, setSearchTime] = useState<number>(0);

  useEffect(() => {
    const fetchKnowledgeItems = async () => {
      // Start timing the search
      const startTime = performance.now();

      setIsLoading(true);
      const response = await fetch('/api/knowledge/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: debouncedQuery,
          selectedCategories,
        }),
      });

      const result = await response.json();

      if (result.error) {
        console.error('Error fetching knowledge data:', result.error);
      } else {
        setKnowledgeItems(result.data);
      }
      setIsLoading(false);

      // End timing and calculate the duration
      const endTime = performance.now();
      setSearchTime(endTime - startTime);
    };

    fetchKnowledgeItems();
  }, [debouncedQuery, selectedCategories]);

  return (
    <Navbar>
      <main className="min-h-screen mx-auto max-w-7xl">
        <Card className="bg-card text-card-foreground h-full flex flex-col">
          <CardHeader className={`flex flex-col pb-1 ${GeistSans.className}`}>
            {/* Search Bar */}
            <Input
              type="text"
              placeholder="Search..."
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
            {/* Update the records display to include search time */}
            <div className="text-md text-muted-foreground pb-2 px-2 flex items-center justify-between">
              {isLoading
                ? 'Loading...'
                : knowledgeItems && knowledgeItems.length > 0
                ? `${knowledgeItems.length} records`
                : 'No results found'}
              {!isLoading && knowledgeItems && knowledgeItems.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {searchTime < 1000
                    ? `${searchTime.toFixed(0)} ms`
                    : `${(searchTime / 1000).toFixed(2)} s`}
                </span>
              )}
            </div>
            {isLoading ? (
              // Render Skeletons while loading
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2 pb-6">
                  {[...Array(6)].map((_, index) => (
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
                  ))}
                </div>
              </ScrollArea>
            ) : (
              // Render knowledge items when data is loaded
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2 pb-6">
                  {knowledgeItems.map((item) => (
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
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>
    </Navbar>
  );
}
