"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LoaderIcon,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  MessageSquare,
  SquareActivity,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AiPictureDialog from "@/components/ui/ai-picture-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import Markdown from "react-markdown";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
import { GeistSans } from 'geist/font/sans';
enum ConversationState {
  INACTIVE = "INACTIVE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
}

// Custom hook to check for messages
const useWaitForMessages = (messages: Message[]) => {
  const [hasMessages, setHasMessages] = useState(messages.length > 0);

  const waitForMessages = useCallback(async () => {
    if (messages.length === 0) {
      console.log("Waiting for messages...");
      const bufferTime = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < bufferTime) {
        if (messages.length > 0) {
          setHasMessages(true);
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("No messages received after 2-second buffer.");
      return false;
    }
    return true;
  }, [messages]);

  return { hasMessages, waitForMessages };
};

export default function ChatRoomPage() {
  const [conversationState, setConversationState] = useState<ConversationState>(
    ConversationState.INACTIVE
  );
  const [micIsEnabled, setMicEnabled] = useState(false);
  const { toast } = useToast();
  const [accumulatedMessages, setAccumulatedMessages] = useState<Message[]>([]);
  const [sessionDuration, setSessionDuration] = useState(0);
  const userVideoRef = useRef<HTMLVideoElement>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [aiPictureDialogOpen, setAiPictureDialogOpen] = useState(false);
  const [previousPictureAnalysis, setPreviousPictureAnalysis] = useState<
    string | null
  >(null);
  const [showDiagnosticReport, setShowDiagnosticReport] = useState(false);

  const { anamClient } = useAnam();

  const { waitForMessages } = useWaitForMessages(rawMessages);

  // Add this new state to track if a session has started
  const [sessionStarted, setSessionStarted] = useState(false);

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

    // Update rawMessages
    setRawMessages((prevRawMessages) => [...prevRawMessages, messageEvent]);

    // Update accumulatedMessages (existing logic)
    setAccumulatedMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      if (messageEvent.role === "persona" && newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];
        if (
          lastMessage.role === "persona" &&
          lastMessage.id === messageEvent.id
        ) {
          if (!lastMessage.content.endsWith(messageEvent.content)) {
            lastMessage.content += messageEvent.content;
          }
          return newMessages;
        }
      }
      // Add as a new message if it doesn't match the previous one
      return [...newMessages, messageEvent];
    });
  };

  const onMessageHistoryUpdated = (messages: Message[]) => {
    console.log("Message HISTORY updated", messages);
    setAccumulatedMessages(messages);
    // Update rawMessages with the full message history
    setRawMessages(messages);
    setAccumulatedMessages(messages);
    // Update rawMessages with the full message history
    setRawMessages(messages);
  };

  const debouncedStartConversation = debounce(async () => {
    if (
      conversationState !== ConversationState.INACTIVE ||
      anamClient.isStreaming()
    ) {
      return;
    }
    setConversationState(ConversationState.LOADING);
    try {
      // Remove all existing listeners before adding new ones
      anamClient.removeListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.removeListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.removeListener(
        AnamEvent.CONNECTION_CLOSED,
        onConnectionClosed
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_STREAM_STARTED,
        onVideoStartedStreaming
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
        onMessageReceived
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_HISTORY_UPDATED,
        onMessageHistoryUpdated
      );

      // Add listeners
      anamClient.addListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.addListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.addListener(AnamEvent.CONNECTION_CLOSED, onConnectionClosed);
      anamClient.addListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
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
      anamClient.removeListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.removeListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.removeListener(
        AnamEvent.CONNECTION_CLOSED,
        onConnectionClosed
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_STREAM_STARTED,
        onVideoStartedStreaming
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
        onMessageReceived
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_HISTORY_UPDATED,
        onMessageHistoryUpdated
      );

      // Add listeners
      anamClient.addListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.addListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.addListener(AnamEvent.CONNECTION_CLOSED, onConnectionClosed);
      anamClient.addListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
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

      await anamClient.streamToVideoAndAudioElements("video", "audio");
    } catch (error) {
      console.error("Error starting conversation:", error);
      setConversationState(ConversationState.INACTIVE);
      toast({
        title: "Connection Error",
        description: "Failed to start the conversation. Please try again.",
        variant: "destructive",
      });
    }
  }, 500);

  const startConversation = useCallback(async () => {
    setAccumulatedMessages([]);
    setRawMessages([]);
    setConversationState(ConversationState.LOADING);
    setGeneratingReport(false);
    setDiagnosticReport(null);

    // reset the view to transcription and mark session as started
    setShowDiagnosticReport(false);
    setSessionStarted(true);

    try {
      // Remove all existing listeners before adding new ones
      anamClient.removeListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.removeListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.removeListener(
        AnamEvent.CONNECTION_CLOSED,
        onConnectionClosed
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_STREAM_STARTED,
        onVideoStartedStreaming
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
        onMessageReceived
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_HISTORY_UPDATED,
        onMessageHistoryUpdated
      );

      // Add listeners
      anamClient.addListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.addListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.addListener(AnamEvent.CONNECTION_CLOSED, onConnectionClosed);
      anamClient.addListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
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
      anamClient.removeListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.removeListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.removeListener(
        AnamEvent.CONNECTION_CLOSED,
        onConnectionClosed
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
      anamClient.removeListener(
        AnamEvent.VIDEO_STREAM_STARTED,
        onVideoStartedStreaming
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
        onMessageReceived
      );
      anamClient.removeListener(
        AnamEvent.MESSAGE_HISTORY_UPDATED,
        onMessageHistoryUpdated
      );

      // Add listeners
      anamClient.addListener(
        AnamEvent.CONNECTION_ESTABLISHED,
        onConnectionEstablished
      );
      anamClient.addListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
      anamClient.addListener(AnamEvent.CONNECTION_CLOSED, onConnectionClosed);
      anamClient.addListener(
        AnamEvent.VIDEO_PLAY_STARTED,
        onVideoStartedPlaying
      );
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

      await anamClient.streamToVideoAndAudioElements("video", "audio");
      setConversationState(ConversationState.ACTIVE);
    } catch (error) {
      console.error("Error starting conversation:", error);
      setConversationState(ConversationState.INACTIVE);
      toast({
        title: "Connection Error",
        description: "Failed to start the conversation. Please try again.",
        variant: "destructive",
      });
    }
  }, [anamClient, setConversationState, toast]);

  const stopConversation = () => {
    debouncedStartConversation.cancel();
    anamClient.stopStreaming();

    // Remove all listeners
    anamClient.removeListener(
      AnamEvent.CONNECTION_ESTABLISHED,
      onConnectionEstablished
    );
    anamClient.removeListener(AnamEvent.AUDIO_STREAM_STARTED, onAudioStarted);
    anamClient.removeListener(AnamEvent.CONNECTION_CLOSED, onConnectionClosed);
    anamClient.removeListener(
      AnamEvent.VIDEO_PLAY_STARTED,
      onVideoStartedPlaying
    );
    anamClient.removeListener(
      AnamEvent.VIDEO_STREAM_STARTED,
      onVideoStartedStreaming
    );
    anamClient.removeListener(
      AnamEvent.MESSAGE_STREAM_EVENT_RECEIVED,
      onMessageReceived
    );
    anamClient.removeListener(
      AnamEvent.MESSAGE_HISTORY_UPDATED,
      onMessageHistoryUpdated
    );

    toast({
      title: "Conversation Stopped",
      description: "The conversation has been stopped.",
    });
    setConversationState(ConversationState.INACTIVE);
    setSessionDuration(0);
    setAccumulatedMessages([]);
    setRawMessages([]);
    setGeneratingReport(false);
    setDiagnosticReport(null);
    setMicEnabled(false);
    anamClient.muteInputAudio();

    // Reset the view to transcription and mark session as ended
    setShowDiagnosticReport(false);
    setSessionStarted(false);

    // Stop the camera
    if (userVideoRef.current && userVideoRef.current.srcObject) {
      const tracks = (
        userVideoRef.current.srcObject as MediaStream
      ).getTracks();
      tracks.forEach((track) => track.stop());
      userVideoRef.current.srcObject = null;
    }
  };

  const getAIClassification = async () => {
    const messagesAvailable = await waitForMessages();
    if (!messagesAvailable) {
      console.log("Aborting AI response due to no messages.");
      return;
    }

    const allLines = rawMessages
      .map((message: Message) => message.content)
      .join("\n");

    try {
      const response = await fetch("/api/classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientInput: allLines,
          previousPictureAnalysis: previousPictureAnalysis,
        }),
      });

      const { needsPicture } = await response.json();

      if (needsPicture) {
        anamClient.talk(
          "To help me better understand your condition, could I please see a picture of it?"
        );
        setAiPictureDialogOpen(true);
      } else {
        getAIResponse();
      }
    } catch (error) {
      console.error("Error getting AI classification:", error);
    }
  };

  const handlePictureAnalysis = (pictureAnalysis: string | null = null) => {
    setPreviousPictureAnalysis(pictureAnalysis);
    getAIResponse(pictureAnalysis);
  };

  const getAIResponse = useCallback(
    async (pictureAnalysis: string | null = null) => {
      const messagesAvailable = await waitForMessages();
      if (!messagesAvailable) {
        console.log("Aborting AI response due to no messages.");
        return;
      }

      let allLines = rawMessages
        .map((message: Message) => message.content)
        .join("\n");

      if (pictureAnalysis) {
        allLines += `\n\nHere is a description of a picture of the condition: ${pictureAnalysis}`;
      }

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

        // Check if the session is active before calling talk
        if (conversationState === ConversationState.ACTIVE) {
          try {
            await anamClient.talk(aiResponse);
          } catch (talkError) {
            console.error("Error calling anamClient.talk:", talkError);
            // Attempt to restart the session
            await startConversation();
            // Try talking again after restarting
            await anamClient.talk(aiResponse);
          }
        } else {
          console.warn("Cannot call talk: Conversation is not active");
        }
      } catch (error) {
        console.error("Error getting AI response:", error);
        toast({
          title: "Error",
          description: "Failed to get AI response",
          variant: "destructive",
        });
      }
    },
    [
      rawMessages,
      waitForMessages,
      conversationState,
      anamClient,
      startConversation,
      toast,
    ]
  );

  const onMicTriggered = () => {
    if (micIsEnabled) {
      setMicEnabled(false);
      anamClient.muteInputAudio();
      getAIClassification();
    } else {
      setMicEnabled(true);
      anamClient.unmuteInputAudio();
    }
  };

  const onGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      const response = await fetch("/api/generate-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: accumulatedMessages }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const report = await response.text();
      setDiagnosticReport(report);
      setShowDiagnosticReport(true); // Automatically switch to diagnostic mode
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate diagnostic report",
        variant: "destructive",
      });
    } finally {
      setGeneratingReport(false);
    }
  };

  const toggleView = () => {
    if (sessionStarted) {
      setShowDiagnosticReport((prev) => !prev);
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
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Error accessing camera:", err));
    } else {
      if (userVideoRef.current && userVideoRef.current.srcObject) {
        const tracks = (
          userVideoRef.current.srcObject as MediaStream
        ).getTracks();
        tracks.forEach((track) => track.stop());
      }
    }
  }, [conversationState]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  return (
    <Navbar>
      <main className="min-h-screen mx-auto max-w-7xl">
        <div className="bg-green-50 border-l-4 border-green-700 p-4 mb-6 rounded-md shadow-md">
          <div className="flex items-center">
            <div className="flex-grow">
              <h2 className="text-2xl font-semibold text-green-800">
                👋 Good {getGreeting()}, Dinesh
              </h2>
              <p className={`mt-2 text-sm text-green-700 ${GeistSans.className}`}>
                I&apos;m Aria, your AI health assistant powered by the
                latest medical research from Medline, PubMed, and more. I&apos;m
                here to chat about your health concerns and guide you through treatment advice in a secure manner. 
                
                Feel free to start a session whenever you&apos;re
                ready. Remember, I&apos;m here to support you, but for
                more serious medical advice, always consult with a qualified
                healthcare professional.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Aria Card */}
          <motion.div
            layout
            className={cn(
              "transition-all duration-500 ease-in-out",
              showDiagnosticReport ? "lg:col-span-1" : "lg:col-span-2"
            )}
          >
            <Card className="text-card-foreground h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[72px]">
                <CardTitle className="text-2xl font-light text-green-700">
                  Talk to Aria
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      conversationState === ConversationState.ACTIVE
                        ? "default"
                        : "secondary"
                    }
                  >
                    {conversationState === ConversationState.ACTIVE
                      ? "Active"
                      : conversationState === ConversationState.LOADING
                      ? "Connecting..."
                      : "Inactive"}
                  </Badge>
                  {conversationState === ConversationState.ACTIVE && (
                    <Badge variant="outline" className="text-green-700">
                      {new Date(sessionDuration * 1000)
                        .toISOString()
                        .substr(11, 8)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <Separator className="my-2" />
              <CardContent className="p-4 h-[calc(60vh-80px)] flex items-center justify-center">
                {conversationState !== ConversationState.INACTIVE ? (
                  <AvatarPlayer />
                ) : (
                  <div className="text-center">
                    <div className="w-48 h-48 mx-auto mb-6">
                      <Image
                        src="/aria-avatar.png"
                        alt="Aria"
                        width={192}
                        height={192}
                        className="rounded-full border-4 border-green-100"
                      />
                    </div>
                    <h3 className="text-2xl font-semibold text-green-700 mb-3">
                      Hi, I&apos;m Aria
                    </h3>
                    <p className={`text-sm text-muted-foreground ${GeistSans.className}`}>
                      I&apos;m here to listen and chat whenever you&apos;re
                      ready. Feel free to start our session when you&apos;re
                      comfortable.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Patient Interaction Card */}
          <motion.div
            layout
            className={cn(
              "transition-all duration-500 ease-in-out",
              showDiagnosticReport ? "lg:col-span-2" : "lg:col-span-1"
            )}
          >
            <Card className="bg-card text-card-foreground h-full flex flex-col">
              <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between h-[72px]">
                <CardTitle className="text-2xl font-light text-green-700">
                  {showDiagnosticReport ? "Diagnostic Report" : "Transcription"}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "transition-all duration-200 w-full md:w-auto",
                    showDiagnosticReport
                      ? "text-green-700 hover:bg-green-50"
                      : "bg-green-700 text-white hover:bg-green-800"
                  )}
                  onClick={toggleView}
                  disabled={!diagnosticReport || !sessionStarted}
                >
                  {showDiagnosticReport ? "View Transcription" : "View Diagnostic"}
                </Button>
              </CardHeader>
              <Separator className="my-2" />
              <CardContent className="p-4 flex-grow flex flex-col overflow-hidden h-[calc(60vh-80px)]">
                <AnimatePresence mode="wait">
                  {showDiagnosticReport && diagnosticReport ? (
                    <motion.div
                      key="report"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="overflow-y-auto flex-grow"
                    >
                      <Markdown>{diagnosticReport}</Markdown>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="transcription"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col flex-grow overflow-hidden"
                    >
                      {conversationState === ConversationState.ACTIVE && userVideoRef.current ? (
                        <div className="mb-4 h-48">
                          <video
                            ref={userVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </div>
                      ) : conversationState === ConversationState.LOADING ? (
                        <Skeleton isLoading={true} className="mb-4 h-48 w-full" />
                      ) : null}
                      <ScrollArea className="flex-grow overflow-y-auto">
                        <div className="space-y-4 pr-4">
                          {accumulatedMessages.length === 0 ? (
                            <div className="flex items-start space-x-3 p-4 rounded-lg bg-blue-50">
                              <div className="flex-shrink-0">
                                <Image
                                  src="/aria-avatar.png"
                                  alt="Aria"
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-800">
                                  Aria
                                </p>
                                <p className={`text-sm text-blue-700 leading-relaxed mt-1 ${GeistSans.className}`}>
                                  Hey there! I&apos;m Aria, your AI health assistant.
                                  I&apos;m here to listen, provide information, and
                                  offer guidance on general health topics. Feel free to
                                  ask me about symptoms, wellness tips, or any
                                  health-related questions you might have. Remember,
                                  I&apos;m here to support you, but for specific medical
                                  advice, always consult with a qualified healthcare
                                  professional.
                                </p>
                                <p className={`text-sm text-blue-600 mt-2 italic ${GeistSans.className}`}>
                                  How can I assist you with your health today?
                                </p>
                              </div>
                            </div>
                          ) : (
                            accumulatedMessages.map((message, index) => (
                              <div
                                key={index}
                                className={`flex items-start space-x-3 p-3 rounded-lg ${
                                  message.role === "user" ? "bg-green-50" : "bg-blue-50"
                                }`}
                              >
                                <div className="flex-shrink-0 mt-1">
                                  {message.role === "user" ? (
                                    <MessageSquare className="w-5 h-5 text-green-700" />
                                  ) : (
                                    <Image
                                      src="/aria-avatar.png"
                                      alt="Aria"
                                      width={20}
                                      height={20}
                                      className="rounded-full"
                                    />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p
                                    className={`text-sm font-semibold ${
                                      message.role === "user"
                                        ? "text-green-800"
                                        : "text-blue-800"
                                    }`}
                                  >
                                    {message.role === "user" ? "You" : "Aria"}
                                  </p>
                                  <p
                                    className={`${GeistSans.className} text-sm mt-1 ${
                                      message.role === "user"
                                        ? "text-green-700"
                                        : "text-blue-700"
                                    }`}
                                  >
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
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
                        setAccumulatedMessages([]);
                        setRawMessages([]);
                        if (conversationState === ConversationState.ACTIVE) {
                          stopConversation();
                        } else if (
                          conversationState === ConversationState.INACTIVE
                        ) {
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
                        micIsEnabled
                          ? "bg-green-700 text-white hover:bg-green-800"
                          : "text-green-700 hover:bg-green-50"
                      )}
                      onClick={onMicTriggered}
                      disabled={conversationState !== ConversationState.ACTIVE}
                    >
                      {!micIsEnabled ? (
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
                    {micIsEnabled
                      ? "Unmute your microphone"
                      : "Mute your microphone"}
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
                        generatingReport
                          ? "bg-green-700 text-white hover:bg-green-800"
                          : "text-green-700 hover:bg-green-50"
                      )}
                      onClick={onGenerateReport}
                      disabled={
                        conversationState !== ConversationState.ACTIVE ||
                        generatingReport
                      }
                    >
                      {generatingReport ? (
                        <>
                          <LoaderIcon className="w-6 h-6 mr-2 animate-spin" />
                          Generating Report
                        </>
                      ) : (
                        <>
                          <SquareActivity className="w-6 h-6 mr-2" />
                          Diagnostic Report
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Generate a diagnostic report based on your conversation with
                    Aria
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </CardContent>
        </Card>
        <AiPictureDialog
          open={aiPictureDialogOpen}
          setOpen={setAiPictureDialogOpen}
          pictureDescriptionCallback={handlePictureAnalysis}
        />
      </main>
    </Navbar>
  );
}