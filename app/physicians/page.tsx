"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/nav/Navbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GeistSans } from "geist/font/sans";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useDebounce } from "use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import states from "@/data/states.json";

type Physician = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  speciality: string | null;
  region: string | null;
  photo_url: string | null;
  link: string;
  locality: string | null;
};

export default function PhysiciansPage() {
  const [physicians, setPhysicians] = useState<Physician[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchPhysicians = async () => {
      setIsLoading(true);
      const response = await fetch('/api/physicians/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: debouncedQuery,
          state: selectedState,
        }),
      });

      const result = await response.json();

      if (result.error) {
        console.error('Error fetching physicians:', result.error);
      } else {
        setPhysicians(result.data);
      }
      setIsLoading(false);
    };

    fetchPhysicians();
  }, [debouncedQuery, selectedState]);

  return (
    <Navbar>
      <main className="min-h-screen mx-auto max-w-7xl">
        <Card className="bg-card text-card-foreground h-full flex flex-col">
          <CardHeader className={`flex flex-col pb-3 ${GeistSans.className}`}>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Search physicians..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-grow"
              />
              <Select key={selectedState} value={selectedState} onValueChange={setSelectedState}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="states">All States</SelectItem>
                  {states.states.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className={`px-4 py-0 flex-grow ${GeistSans.className}`}>
            {isLoading ? (
              // Render Skeletons while loading
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2 pb-6">
                  {[...Array(6)].map((_, index) => (
                    <Skeleton key={index} className="h-40">
                      <Card className="rounded-lg shadow-md p-4 flex flex-col">
                        {/* Skeleton content */}
                      </Card>
                    </Skeleton>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              // Render physicians when data is loaded
              <ScrollArea className="h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-2 pb-6">
                  {physicians.map((physician) => (
                    <Card
                      key={physician.id}
                      className="rounded-lg shadow-md p-4 flex flex-col"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg font-semibold text-green-800">
                            {physician.first_name} {physician.last_name}
                          </CardTitle>
                          {physician.speciality && (
                            <Badge variant="outline" className="mr-2">
                              {physician.speciality}
                            </Badge>
                          )}
                        </div>
                        <Link href={physician.link}>
                          <Button variant="ghost" size="icon">
                            <ArrowRight className="w-5 h-5" />
                          </Button>
                        </Link>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {physician.locality}, {physician.region}
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
