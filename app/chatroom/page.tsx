"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoaderIcon, Mic, MicOff, Phone, PhoneOff, MessageSquare } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { useAnam } from "../contexts/AnamContext";
import {
  AnamEvent,
  Message,
  MessageStreamEvent,
} from "@anam-ai/js-sdk/dist/module/types";
import { useToast } from "@/hooks/use-toast";
import AvatarPlayer from "@/components/avatar-player";
import Navbar from "@/components/nav/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Add this enum definition
enum ConversationState {
  INACTIVE = "INACTIVE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
}

export default function ChatRoomPage() {
  const [conversationState, setConversationState] = useState<ConversationState>(
    ConversationState.INACTIVE
  );
  const [micIsEnabled, setMicEnabled] = useState(false);
  const { toast } = useToast();
  const [accumulatedMessages, setAccumulatedMessages] = useState<Message[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const userVideoRef = useRef<HTMLVideoElement>(null);

  const { anamClient } = useAnam();

  const onConnectionEstablished = () => {
    console.log("Connection established");
    toast({
      title: "Connection Established",
      description: "The connection to the persona has been established.",
    });
    setConversationState(ConversationState.ACTIVE);
  };

  const onConnectionClosed = (reason: string) => {
    console.log("Connection closed", reason);
    toast({
      title: "Connection Closed",
      description: reason,
      variant: "destructive",
    });
    setConversationState(ConversationState.INACTIVE);
  };

  const onVideoStartedPlaying = () => {
    console.log("Video started playing");
    toast({
      title: "Video Started Playing",
      description: "The video is now playing.",
    });
    setConversationState(ConversationState.ACTIVE);
  };

  const onVideoStartedStreaming = () => {
    console.log("Video started streaming");
    toast({
      title: "Video Started Streaming",
      description: "The video is now streaming.",
    });
    setConversationState(ConversationState.ACTIVE);
  };

  const onAudioStarted = () => {
    console.log("Audio started");
  };

  const onMessageReceived = (messageEvent: MessageStreamEvent) => {
    console.log("Message received", messageEvent);
    setAccumulatedMessages([...accumulatedMessages, messageEvent]);
  };

  const onMessageHistoryUpdated = (messages: Message[]) => {
    console.log("Message HISTORY updated", messages);
  };

  const startConversation = async () => {
    if (
      !(
        conversationState === ConversationState.INACTIVE &&
        !anamClient.isStreaming()
      )
    ) {
      return;
    }
    setConversationState(ConversationState.LOADING);
    anamClient.addListener(
      AnamEvent.CONNECTION_ESTABLISHED,
      onConnectionEstablished
    );
    anamClient.addListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
    anamClient.addListener(AnamEvent.CONNECTION_CLOSED, onConnectionClosed);
    anamClient.addListener(AnamEvent.VIDEO_PLAY_STARTED, onVideoStartedPlaying);
    anamClient.addListener(
      AnamEvent.VIDEO_STREAM_STARTED,
      onVideoStartedStreaming
    );
    anamClient.addListener(
      AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
      onMessageReceived
    );
    anamClient.addListener(
      AnamEvent.MESSAGE_HISTORY_UPDATED,
      onMessageHistoryUpdated
    );
    try {
      console.log("Starting conversation");
      console.log(anamClient.isStreaming());
      await anamClient.streamToVideoAndAudioElements("video", "audio");
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast({
          title: "Persona Busy",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Unknown Error",
          description: `An unknown error occurred: ${error}`,
          variant: "destructive",
        });
        console.error(error);
      }
    }
  };

  const stopConversation = () => {
    anamClient.stopStreaming();
    toast({
      title: "Conversation Stopped",
      description: "The conversation has been stopped.",
    });
    setConversationState(ConversationState.INACTIVE);
    
    // Reset session duration
    setSessionDuration(0);
    
    // Clear message history
    setAccumulatedMessages([]);
    
    // Turn off the microphone
    setMicEnabled(false);
    anamClient.muteInputAudio();
    
    // Stop the camera
    if (userVideoRef.current && userVideoRef.current.srcObject) {
      const tracks = (userVideoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      userVideoRef.current.srcObject = null;
    }
  };

  const getAIResponse = async () => {
    const allLines = accumulatedMessages
      .map((message: Message) => message.content)
      .join("\n");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ patientInput: allLines }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }

      let aiResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        const chunk = new TextDecoder().decode(value);
        aiResponse += chunk;
      }

      console.log("Complete AI response:", aiResponse);
      anamClient.talk(aiResponse);
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    }
  };

  const onMicTriggered = () => {
    if (micIsEnabled) {
      setMicEnabled(false);
      anamClient.muteInputAudio();
      getAIResponse();
    } else {
      setMicEnabled(true);
      anamClient.unmuteInputAudio();

      setAccumulatedMessages([]);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (conversationState === ConversationState.ACTIVE) {
      interval = setInterval(() => {
        setSessionDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [conversationState]);

  useEffect(() => {
    if (conversationState === ConversationState.ACTIVE) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        })
        .catch(err => console.error("Error accessing camera:", err));
    } else {
      if (userVideoRef.current && userVideoRef.current.srcObject) {
        const tracks = (userVideoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    }
  }, [conversationState]);

  return (
    <Navbar>
      <main className="min-h-screen p-4 sm:p-8 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aria Card */}
          <Card className="bg-card text-card-foreground lg:col-span-2 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-2xl font-light text-green-700">Aria</CardTitle>
              <div className="flex items-center space-x-2">
                <Badge variant={conversationState === ConversationState.ACTIVE ? "default" : "secondary"}>
                  {conversationState === ConversationState.ACTIVE ? "Active" : 
                   conversationState === ConversationState.LOADING ? "Connecting..." : "Inactive"}
                </Badge>
                {conversationState === ConversationState.ACTIVE && (
                  <Badge variant="outline" className="text-green-700">
                    {new Date(sessionDuration * 1000).toISOString().substr(11, 8)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <Separator className="my-2" />
            <CardContent className="p-0 h-[calc(60vh-80px)] relative">
              {conversationState !== ConversationState.INACTIVE &&
                <div className="rounded-lg overflow-hidden h-full p-3">
                  <AvatarPlayer />
                </div>
              }
              {conversationState === ConversationState.INACTIVE && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                  <div className="text-center max-w-md mx-auto px-4">
                    <div className="relative w-80 h-80 mx-auto mb-6">
                      <Image
                        src="/aria-avatar.png"
                        alt="Aria"
                        layout="fill"
                        objectFit="cover"
                        className="rounded-full border-4 border-green-100"
                      />
                    </div>
                    <h3 className="text-2xl font-semibold text-green-700 mb-3">Hi, I&apos;m Aria</h3>
                    <p className="text-sm text-muted-foreground">
                      I&apos;m here to listen and chat whenever you&apos;re ready. 
                      Feel free to start our session when you&apos;re comfortable.
                    </p>
                  </div>
                </div>
              )}
              {conversationState === ConversationState.LOADING && (
                <div className="absolute inset-0 flex items-center justify-center bg-transparent">
                  <LoaderIcon className="w-10 h-10 animate-spin text-green-700" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Patient Interaction Card */}
          <Card className="bg-card text-card-foreground">
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl font-light text-green-700">You</CardTitle>
            </CardHeader>
            <Separator className="my-2" />
            <CardContent className="p-4 h-[calc(60vh-80px)]">
              {conversationState === ConversationState.ACTIVE && (
                <div className="mb-4">
                  <video
                    ref={userVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              <ScrollArea className="h-[calc(100%-8rem)] pr-4">
                <div className="space-y-4">
                  {accumulatedMessages.map((message, index) => (
                    <div key={index} className="flex items-start space-x-2 bg-green-50 p-3 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-green-700 mt-1 flex-shrink-0" />
                      <p className="text-sm text-green-800">{message.content}</p>
                    </div>
                  ))}
                  {accumulatedMessages.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">Your conversation with Aria will appear here...</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Control Panel */}
        <Card className="mt-6 bg-card text-card-foreground">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="default"
                      size="lg"
                      className={cn(
                        "w-full sm:w-auto px-6 py-3 text-lg font-semibold transition-all duration-200",
                        conversationState === ConversationState.ACTIVE
                          ? "bg-red-500 hover:bg-red-600"
                          : conversationState === ConversationState.LOADING
                          ? "bg-yellow-500 hover:bg-yellow-600"
                          : "bg-green-700 hover:bg-green-800"
                      )}
                      onClick={() => {
                        if (conversationState === ConversationState.ACTIVE) {
                          stopConversation();
                        } else if (conversationState === ConversationState.INACTIVE) {
                          startConversation();
                        }
                      }}
                      disabled={conversationState === ConversationState.LOADING}
                    >
                      {conversationState === ConversationState.ACTIVE ? (
                        <>
                          <PhoneOff className="w-6 h-6 mr-2" />
                          End Session
                        </>
                      ) : conversationState === ConversationState.LOADING ? (
                        <>
                          <LoaderIcon className="w-6 h-6 mr-2 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Phone className="w-6 h-6 mr-2" />
                          Start Session
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {conversationState === ConversationState.ACTIVE
                      ? "End your conversation with Aria"
                      : conversationState === ConversationState.LOADING
                      ? "Please wait while connecting"
                      : "Begin your conversation with Aria"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="lg"
                      className={cn(
                        "w-full sm:w-auto px-6 py-3 text-lg font-semibold transition-all duration-200",
                        micIsEnabled ? "bg-green-700 text-white hover:bg-green-800" : "text-green-700 hover:bg-green-50"
                      )}
                      onClick={onMicTriggered}
                      disabled={conversationState !== ConversationState.ACTIVE}
                    >
                      {micIsEnabled ? (
                        <>
                          <MicOff className="w-6 h-6 mr-2" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <Mic className="w-6 h-6 mr-2" />
                          Mute
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {micIsEnabled ? "Unmute your microphone" : "Mute your microphone"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
      </main>
    </Navbar>
  );
}
