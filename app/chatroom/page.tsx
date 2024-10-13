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
  Camera,
  CameraOff,
  Folder,
  ExternalLinkIcon,
  Brain,
  User,
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
// import { Skeleton } from "@/components/ui/skeleton";
import Markdown from "react-markdown";
import { debounce } from "lodash";
import { motion, AnimatePresence } from "framer-motion";
import { GeistSans } from "geist/font/sans";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AnamClient } from "@anam-ai/js-sdk";
import hark from "hark";
import KnowledgeManagementModal from "@/components/ui/KnowledgeManagementModal";

type Doctor = Database["public"]["Tables"]["new_doctors"]["Row"];
import { Database } from "@/lib/types/schema";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Graph from "@/components/ui/mermaid";
import { Dialog, DialogContent } from "@/components/ui/dialog";

enum ConversationState {
  INACTIVE = "INACTIVE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
}

type KnowledgeBaseItem =
  Database["public"]["Functions"]["match_documents"]["Returns"][number];

// Custom hook to check for messages
const useWaitForMessages = (messagesRef: React.MutableRefObject<Message[]>) => {
  const [hasMessages, setHasMessages] = useState(
    messagesRef.current.length > 0
  );

  const waitForMessages = useCallback(async () => {
    if (messagesRef.current.length === 0) {
      console.log("Waiting for messages...");
      const bufferTime = 2000;
      const startTime = Date.now();

      while (Date.now() - startTime < bufferTime) {
        if (messagesRef.current.length > 0) {
          setHasMessages(true);
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log("No messages received after 2-second buffer.");
      return false;
    }
    return true;
  }, [messagesRef]);

  return { hasMessages, waitForMessages };
};

// Extract UserVideoFeed component outside of ChatRoomPage
function UserVideoFeed({
  cameraEnabled,
  userVideoRef,
}: {
  cameraEnabled: boolean;
  userVideoRef: React.RefObject<HTMLVideoElement>;
}) {
  return (
    <div className="mb-4 h-48 relative">
      {cameraEnabled ? (
        <video
          ref={userVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover rounded-lg"
        />
      ) : (
        <div className="w-full h-full bg-gray-200 rounded-lg flex items-center justify-center">
          <Avatar>
            <AvatarFallback>JS</AvatarFallback>
          </Avatar>
        </div>
      )}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded-md text-sm">
        You
      </div>
    </div>
  );
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
  const [generatingReport, setGeneratingReport] = useState(false);
  const [diagnosticReport, setDiagnosticReport] = useState<string | null>(null);
  const [rawMessages, setRawMessages] = useState<Message[]>([]);
  const [aiPictureDialogOpen, setAiPictureDialogOpen] = useState(false);
  const [previousPictureAnalysis, setPreviousPictureAnalysis] = useState<
    string | null
  >(null);
  const [showDiagnosticReport, setShowDiagnosticReport] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);

  const [fetchedArticles, setFetchedArticles] = useState<KnowledgeBaseItem[]>(
    []
  );
  const [graph, setGraph] = useState<string | null>(null);
  const [isGraphModalOpen, setIsGraphModalOpen] = useState(false);

  const { anamClient, reset: resetAnamClient } = useAnam();

  const [stopHark, setStopHark] = useState<(() => void) | undefined>();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [didInterruptSpeaking, setDidInterruptSpeaking] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  // Set of references to keep track of states that Hark closures rely on
  const rawMessagesRef = useRef<Message[]>(rawMessages);
  const { waitForMessages } = useWaitForMessages(rawMessagesRef);
  const anamClientRef = useRef<AnamClient>(anamClient);
  const previousPictureAnalysisRef = useRef<string | null>(
    previousPictureAnalysis
  );
  const conversationStateRef = useRef<ConversationState>(conversationState);
  const isSpeakingRef = useRef<boolean>(isSpeaking);
  const didInterruptSpeakingRef = useRef<boolean>(didInterruptSpeaking);
  const micIsEnabledRef = useRef<boolean>(micIsEnabled);
  const articlesRef = useRef<KnowledgeBaseItem[]>(fetchedArticles);
  const graphRef = useRef<string | null>(graph);
  const doctorsRef = useRef<Doctor[]>(doctors);

  useEffect(() => {
    rawMessagesRef.current = rawMessages;
  }, [rawMessages]);

  useEffect(() => {
    anamClientRef.current = anamClient;
  }, [anamClient]);

  useEffect(() => {
    previousPictureAnalysisRef.current = previousPictureAnalysis;
  }, [previousPictureAnalysis]);

  useEffect(() => {
    conversationStateRef.current = conversationState;
  }, [conversationState]);

  useEffect(() => {
    didInterruptSpeakingRef.current = didInterruptSpeaking;
  }, [didInterruptSpeaking]);

  useEffect(() => {
    micIsEnabledRef.current = micIsEnabled;
  }, [micIsEnabled]);

  useEffect(() => {
    articlesRef.current = fetchedArticles;
  }, [fetchedArticles]);

  useEffect(() => {
    graphRef.current = graph;
  }, [graph]);

  useEffect(() => {
    doctorsRef.current = doctors;
  }, [doctors]);

  const startHark = useCallback(async () => {
    try {
      setIsSpeaking(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const speechEvents = hark(stream, {
        interval: 100,
        threshold: -50,
      });

      speechEvents.on("speaking", onUserStartSpeaking);
      speechEvents.on("stopped_speaking", onUserStopSpeaking);

      setStopHark(() => () => {
        speechEvents.stop();
        stream.getTracks().forEach((track) => track.stop());
      });
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  }, []);

  // Add this new state to track if a session has started
  const [sessionStarted, setSessionStarted] = useState(false);

  const onConnectionEstablished = useCallback(() => {
    console.log("Connection established");
    toast({
      title: "Connection Established",
      description: "The connection to the persona has been established.",
    });
    setConversationState(ConversationState.ACTIVE);
  }, [toast]);

  const onConnectionClosed = useCallback(
    (reason: string) => {
      console.log("Connection closed", reason);
      toast({
        title: "Connection Closed",
        description: reason,
        variant: "destructive",
      });
      setConversationState(ConversationState.INACTIVE);
    },
    [toast]
  );

  const onVideoStartedPlaying = useCallback(() => {
    console.log("Video started playing");
    toast({
      title: "Video Started Playing",
      description: "The video is now playing.",
    });
    setConversationState(ConversationState.ACTIVE);
  }, [toast]);

  const onVideoStartedStreaming = useCallback(() => {
    console.log("Video started streaming");
    toast({
      title: "Video Started Streaming",
      description: "The video is now streaming.",
    });
    setConversationState(ConversationState.ACTIVE);
  }, [toast]);

  const onAudioStarted = () => {
    console.log("Audio started");
  };

  const onMessageReceived = (messageEvent: MessageStreamEvent) => {
    // console.log("Message received", messageEvent);

    if (messageEvent.interrupted) {
      setDidInterruptSpeaking(true);
    }

    // Update rawMessages
    setRawMessages((prevRawMessages) => [...prevRawMessages, messageEvent]);

    // Update accumulatedMessages (existing logic)
    // setAccumulatedMessages((prevMessages) => {
    //   const newMessages = [...prevMessages];
    //   if (messageEvent.role === "persona" && newMessages.length > 0) {
    //     const lastMessage = newMessages[newMessages.length - 1];
    //     if (
    //       lastMessage.role === "persona" &&
    //       lastMessage.id === messageEvent.id
    //     ) {
    //       if (!lastMessage.content.endsWith(messageEvent.content)) {
    //         lastMessage.content += messageEvent.content;
    //       }
    //       return newMessages;
    //     }
    //   }
    //   // Add as a new message if it doesn't match the previous one
    //   return [...newMessages, messageEvent];
    // });

    setAccumulatedMessages((prevMessages) => {
      const newMessages = [...prevMessages];
      if (messageEvent.role === "persona" && newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];
        if (
          lastMessage.role === "persona" &&
          lastMessage.id === messageEvent.id
        ) {
          // Check if the new content is not already at the end of the last message
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
  };

  const debouncedStartConversation = debounce(async () => {
    if (
      conversationState !== ConversationState.INACTIVE ||
      anamClient.isStreaming()
    ) {
      return;
    }
    setConversationState(ConversationState.LOADING);
    setPreviousPictureAnalysis(null);
    setAiPictureDialogOpen(false);
    setMicEnabled(true);
    anamClient.unmuteInputAudio();
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
    setFetchedArticles([]);
    setGraph(null);
    setConversationState(ConversationState.LOADING);
    setGeneratingReport(false);
    setDiagnosticReport(null);
    setPreviousPictureAnalysis(null);
    setAiPictureDialogOpen(false);
    setMicEnabled(true);
    anamClient.unmuteInputAudio();

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
      startHark();
    } catch (error) {
      console.error("Error starting conversation:", error);
      setConversationState(ConversationState.INACTIVE);
      toast({
        title: "Connection Error",
        description: "Failed to start the conversation. Please try again.",
        variant: "destructive",
      });
    }
  }, [
    anamClient,
    onConnectionClosed,
    onConnectionEstablished,
    onVideoStartedPlaying,
    onVideoStartedStreaming,
    startHark,
    toast,
  ]);

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
    setFetchedArticles([]);
    setGraph(null);
    setGeneratingReport(false);
    setDiagnosticReport(null);
    setMicEnabled(false);
    anamClient.muteInputAudio();
    if (stopHark) {
      stopHark();
    }

    // Reset the view to transcription and mark session as ended
    setShowDiagnosticReport(false);
    setSessionStarted(false);

    resetAnamClient();

    // **Remove the code that stops the camera here**
    // **The camera should remain active unless cameraEnabled is set to false**
    /*
    if (userVideoRef.current && userVideoRef.current.srcObject) {
      const tracks = (userVideoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      userVideoRef.current.srcObject = null;
    }
    */
  };

  const getAIClassification = async () => {
    console.log("getAIClassification", isSpeakingRef.current);
    if (isSpeakingRef.current) {
      return;
    }
    const messagesAvailable = await waitForMessages();
    if (!messagesAvailable) {
      console.log("Aborting AI response due to no messages.");
      return;
    }

    if (didInterruptSpeakingRef.current) {
      setDidInterruptSpeaking(false);
      console.log("getting AI response due to interruption");
      getAIResponse();
      return;
    }

    const allLines = rawMessagesRef.current
      .map((message: Message) => message.content)
      .join("\n");

    try {
      const responses = [
        fetch("/api/classify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patientInput: allLines,
            previousPictureAnalysis: previousPictureAnalysisRef.current,
          }),
        }),
        fetch("/api/location/classify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ patientInput: allLines }),
        }),
      ];

      const [classificationResponse, locationResponse] = await Promise.all(
        responses
      );

      const [classificationData, locationData] = await Promise.all([
        classificationResponse.json(),
        locationResponse.json(),
      ]);

      const { needsPicture } = classificationData;
      const { requestingProfessionals } = locationData;

      console.log("needsPicture", needsPicture);
      console.log("requestingProfessionals", requestingProfessionals);
      console.log("# doctors found", doctorsRef.current.length);

      if (requestingProfessionals && doctorsRef.current.length === 0) {
        getDoctors();
      } else if (previousPictureAnalysisRef.current === null && needsPicture) {
        setMicEnabled(false);
        anamClientRef.current.muteInputAudio();
        anamClientRef.current.talk(
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
    setMicEnabled(true);
    anamClientRef.current.unmuteInputAudio();
    setPreviousPictureAnalysis(pictureAnalysis);
    console.log(pictureAnalysis);
    getAIResponse(pictureAnalysis);
  };

  const getDoctors = useCallback(async () => {
    if (isSpeakingRef.current) {
      return;
    }
    const messagesAvailable = await waitForMessages();
    if (!messagesAvailable) {
      console.log("Aborting AI response due to no messages.");
      return;
    }

    const allLines = rawMessagesRef.current
      .map((message: Message) => message.content)
      .join("\n");

    const response = await fetch("/api/location", {
      method: "POST",
      body: JSON.stringify({
        patientInput: allLines,
        patientInfo: {
          firstName: "John",
          lastName: "Smith",
          dateOfBirth: "1999-04-01",
          gender: "Male",
          locality: "Boston",
          region: "MA",
        },
        doctors: doctorsRef.current,
      }),
    });

    const { response: responseText, doctors } = await response.json();

    setDoctors(doctors);

    if (conversationStateRef.current === ConversationState.ACTIVE) {
      try {
        await anamClientRef.current.talk(responseText);
      } catch (error) {
        console.error("Error talking to Anam:", error);
      }
    } else {
      console.warn("Cannot call talk: Conversation is not active");
    }
  }, [waitForMessages]);

  async function getAIResponse(pictureAnalysis: string | null = null) {
    console.log("getAIResponse", isSpeakingRef.current);
    if (isSpeakingRef.current) {
      return;
    }
    const messagesAvailable = await waitForMessages();
    if (!messagesAvailable) {
      console.log("Aborting AI response due to no messages.");
      return;
    }

    let allLines = rawMessagesRef.current
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

      const data = await response.json();
      const aiResponse = data.answer;
      const articles = data.articles;

      if (articles.length > 0) {
        setFetchedArticles(articles);
        const graphResponse = await fetch("/api/graph", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articles }),
        });
        const graphData = await graphResponse.json();
        setGraph(graphData.graphs);
      }

      console.log("Complete AI response:", aiResponse);

      // Check if the session is active before calling talk
      console.log(
        "conversationState",
        conversationState,
        "conversationStateRef",
        conversationStateRef.current
      );
      if (conversationStateRef.current === ConversationState.ACTIVE) {
        try {
          console.log("calling talk");
          await anamClientRef.current.talk(aiResponse);
        } catch (talkError) {
          console.error("Error calling anamClient.talk:", talkError);
          // Attempt to restart the session
          await startConversation();
          // Try talking again after restarting
          await anamClientRef.current.talk(aiResponse);
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
  }

  const onUserStartSpeaking = useCallback(() => {
    setIsSpeaking(() => micIsEnabledRef.current);
  }, []);

  const onUserStopSpeaking = useCallback(() => {
    setIsSpeaking(() => false);
  }, []);

  const onMicTriggered = () => {
    if (micIsEnabled) {
      setMicEnabled(false);
      anamClient.muteInputAudio();
    } else {
      setMicEnabled(true);
      anamClient.unmuteInputAudio();
    }
  };

  useEffect(() => {
    console.log("changed isSpeaking to", isSpeaking, conversationState);
    isSpeakingRef.current = isSpeaking;
    if (!isSpeaking && conversationState === ConversationState.ACTIVE) {
      console.log("getting AI classification");
      getAIClassification();
    }
  }, [isSpeaking]);

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

  const toggleCamera = () => {
    setCameraEnabled(!cameraEnabled);
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
    if (cameraEnabled) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          setMediaStream(stream); // Store the stream in state
          if (userVideoRef.current) {
            userVideoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Error accessing camera:", err));
    } else {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop()); // Stop all tracks
        setMediaStream(null); // Clear the stream from state
      }
      if (userVideoRef.current) {
        userVideoRef.current.srcObject = null;
      }
    }
  }, [cameraEnabled]);

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
                👋 Good {getGreeting()}, John
              </h2>
              <p
                className={`mt-2 text-sm text-green-700 ${GeistSans.className}`}
              >
                I&apos;m Aria, your AI health assistant powered by the latest
                medical research from Medline, PubMed, and more. I&apos;m here
                to chat about your health concerns and guide you through
                treatment advice in a secure manner. Feel free to start a
                private session whenever you&apos;re ready. Remember, I&apos;m here to
                support you, but for more serious medical advice, always consult
                with a qualified healthcare professional.
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Aria Card */}
          <motion.div
            layout
            className={cn(
              "transition-all duration-500 ease-in-out",
              showDiagnosticReport ? "lg:col-span-2" : "lg:col-span-3"
            )}
          >
            <Card className="text-card-foreground h-full flex-grow flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 h-[55px]">
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
                      : "Idle"}
                  </Badge>
                  {conversationState === ConversationState.ACTIVE && (
                    <Badge variant="outline" className="text-green-700">
                      {new Date(sessionDuration * 1000)
                        .toISOString()
                        .substr(11, 8)}
                    </Badge>
                  )}
                  {conversationState === ConversationState.ACTIVE && (
                    <Badge variant="outline" className="text-green-700">
                      {isSpeaking ? "Speaking..." : "Not speaking"}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <Separator className="my-2" />
              <CardContent className="p-4 flex flex-grow flex-col justify-between">
                <div className="flex rounded-md items-center justify-center h-[calc(50vh-80px)] overflow-auto">
                  {conversationState !== ConversationState.INACTIVE ? (
                    <div className="w-full h-full rounded-md flex items-center justify-center">
                      <AvatarPlayer />
                    </div>
                  ) : (
                    <div className="text-center w-full max-w-sm flex flex-col items-center justify-center h-full">
                      <div className="w-48 h-48 mb-6">
                        <Image
                          src="/aria-avatar.png"
                          alt="Aria"
                          width={192}
                          height={192}
                          className="rounded-full border-4 border-green-100"
                        />
                      </div>
                      <h3 className="text-2xl font-semibold text-green-700 mb-4">
                        Hi, I&apos;m Aria
                      </h3>
                      <p
                        className={`text-sm text-muted-foreground ${GeistSans.className} max-w-xs`}
                      >
                        I&apos;m here to listen and chat whenever you&apos;re
                        ready. Feel free to start our session when you&apos;re
                        comfortable.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-end">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-700 hover:bg-green-50"
                          onClick={() => setIsKnowledgeModalOpen(true)}
                        >
                          <Folder className="h-4 w-4 mr-2" />
                          Manage Local Knowledge
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Manage Aria&apos;s knowledge for this conversation
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Patient Interaction Card */}
          <motion.div
            layout
            className={cn(
              "transition-all duration-500 ease-in-out",
              showDiagnosticReport ? "lg:col-span-3" : "lg:col-span-2"
            )}
          >
            <Card className="bg-card text-card-foreground h-full max-h-[calc(66vh-80px)] flex flex-col">
              <CardHeader className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:justify-between h-[55px]">
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
                  {showDiagnosticReport
                    ? "View Transcription"
                    : "View Diagnostic"}
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
                      <UserVideoFeed
                        cameraEnabled={cameraEnabled}
                        userVideoRef={userVideoRef}
                      />

                      <ScrollArea className="flex-grow overflow-y-auto">
                        {(fetchedArticles.length > 0 || graph !== null || doctors.length > 0) && (
                          <div className="mb-4 flex space-x-2">
                            {fetchedArticles.length > 0 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full">
                                    Aria found {fetchedArticles.length} relevant
                                    {fetchedArticles.length > 1
                                      ? " articles"
                                      : " article"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full max-w-md">
                                  <div className="max-h-60 overflow-y-auto">
                                    {fetchedArticles.map((article, index) => (
                                      <div key={index} className="p-2 border-b">
                                        <div className="flex items-center">
                                          <div className="flex-grow">
                                            <p className="font-semibold">
                                              {article.tag}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                              {article.category}
                                            </p>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() =>
                                              window.open(
                                                article.article,
                                                "_blank"
                                              )
                                            }
                                          >
                                            <ExternalLinkIcon className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {doctors.length > 0 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className="w-full">
                                    Aria found {doctors.length} relevant doctor{doctors.length > 1 ? 's' : ''}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-full max-w-md">
                                  <div className="max-h-60 overflow-y-auto">
                                    {doctors.map((doctor, index) => (
                                      <div key={index} className="p-2 border-b">
                                        <div className="flex items-center">
                                          <div className="flex-grow">
                                            <p className="font-semibold">{doctor.first_name} {doctor.last_name}</p>
                                            <p className="text-sm text-gray-500">{doctor.speciality}</p>
                                            <p className="text-sm text-gray-500">{doctor.locality}, {doctor.region}</p>
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => window.open(doctor.link, '_blank')}
                                          >
                                            <User className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}

                            {graph !== null && graph !== "" && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => setIsGraphModalOpen(true)}
                                >
                                  <Brain className="h-4 w-4" />
                                </Button>
                                <Dialog
                                  open={isGraphModalOpen}
                                  onOpenChange={setIsGraphModalOpen}
                                >
                                  <DialogContent>
                                    <Graph graph={graph} />
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                          </div>
                        )}

                        <div className="space-y-4 pr-4">
                          {accumulatedMessages.length === 0 ? (
                            <div className="flex items-start space-x-3 p-4 rounded-lg bg-green-50">
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
                                <p className="text-sm font-semibold text-green-800">
                                  Aria
                                </p>
                                <p
                                  className={`text-sm text-green-700 leading-relaxed mt-1 ${GeistSans.className}`}
                                >
                                  Hey there! I&apos;m Aria, your AI health
                                  assistant. I&apos;m here to listen, provide
                                  information, and offer guidance on general
                                  health topics. Feel free to ask me about
                                  symptoms, wellness tips, or any health-related
                                  questions you might have. Remember, I&apos;m
                                  here to support you, but for specific medical
                                  advice, always consult with a qualified
                                  healthcare professional.
                                </p>
                                <p
                                  className={`text-sm text-green-600 mt-2 italic ${GeistSans.className}`}
                                >
                                  How can I assist you with your health today?
                                </p>
                              </div>
                            </div>
                          ) : (
                            accumulatedMessages.map((message, index) => (
                              <div
                                key={index}
                                className={`flex items-start space-x-3 p-3 rounded-lg ${
                                  message.role === "user"
                                    ? "bg-blue-50"
                                    : "bg-green-50"
                                }`}
                              >
                                <div className="flex-shrink-0 mt-1">
                                  {message.role === "user" ? (
                                    <MessageSquare className="w-5 h-5 text-blue-700" />
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
                                        ? "text-blue-800"
                                        : "text-green-800"
                                    }`}
                                  >
                                    {message.role === "user" ? "You" : "Aria"}
                                  </p>
                                  <p
                                    className={`${
                                      GeistSans.className
                                    } text-sm mt-1 ${
                                      message.role === "user"
                                        ? "text-blue-700"
                                        : "text-green-700"
                                    }`}
                                  >
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {!(fetchedArticles.length > 0) && (
                          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-b from-white to-transparent"></div>
                        )}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-white to-transparent"></div>
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
                        setFetchedArticles([]);
                        setGraph(null);
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
                      ? "Mute your microphone"
                      : "Unmute your microphone"}
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
                        cameraEnabled
                          ? "bg-green-700 text-white hover:bg-green-800"
                          : "text-green-700 hover:bg-green-50"
                      )}
                      onClick={toggleCamera}
                    >
                      {cameraEnabled ? (
                        <>
                          <CameraOff className="w-6 h-6 mr-2" />
                          Turn Camera Off
                        </>
                      ) : (
                        <>
                          <Camera className="w-6 h-6 mr-2" />
                          Turn Camera On
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {cameraEnabled
                      ? "Turn off your camera"
                      : "Turn on your camera"}
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
        <KnowledgeManagementModal
          isOpen={isKnowledgeModalOpen}
          onClose={() => setIsKnowledgeModalOpen(false)}
        />
      </main>
    </Navbar>
  );
}
