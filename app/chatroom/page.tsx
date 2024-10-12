"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LoaderIcon, Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import React, { useState } from "react";
import { useAnam } from "../contexts/AnamContext";
import {
  AnamEvent,
  Message,
  MessageStreamEvent,
} from "@anam-ai/js-sdk/dist/module/types";
import { useToast } from "@/hooks/use-toast";
import AvatarPlayer from "@/components/avatar-player";

// Add this enum definition
enum ConversationState {
  INACTIVE = "INACTIVE",
  LOADING = "LOADING",
  ACTIVE = "ACTIVE",
}

export default function ChatRoomPage() {
  // Replace the boolean state with the enum
  const [conversationState, setConversationState] = useState<ConversationState>(
    ConversationState.INACTIVE
  );
  const [micIsEnabled, setMicEnabled] = useState(false);
  const { toast } = useToast();
  const [accumulatedMessages, setAccumulatedMessages] = useState<Message[]>([]);

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
  };

  const onMicTriggered = () => {
    if (micIsEnabled) {
      setMicEnabled(false);
      anamClient.muteInputAudio();
      const allLines = accumulatedMessages
        .map((message: Message) => message.content)
        .join("\n");
      console.log("All lines", allLines);
    } else {
      setMicEnabled(true);
      anamClient.unmuteInputAudio();

      setAccumulatedMessages([]);
    }
  };

  // useEffect(() => {
  //   return () => {
  //     stopConversation();
  //   };
  // }, []);

  return (
    <div className="h-screen w-screen bg-zinc-900 flex flex-col">
      {/* Main view */}
      <div className="flex-grow p-6 gap-6 flex flex-row">
        <div className="h-full w-full rounded-lg bg-zinc-800 text-white">
          Person
        </div>
        <div className="h-full w-full rounded-lg bg-zinc-800 text-white">
          <AvatarPlayer />
          {conversationState === ConversationState.INACTIVE ? (
            <div className="flex items-center justify-center h-full">
              <span>Conversation not active</span>
            </div>
          ) : conversationState === ConversationState.LOADING ? (
            <div className="flex items-center justify-center h-full">
              <LoaderIcon className="w-7 h-7 animate-spin" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="w-full bg-zinc-800 text-white p-4 flex flex-row justify-center items-center">
        {/* Buttons */}
        <div className="flex flex-row gap-3">
          {/* Call is running */}
          <Button
            variant="default"
            size="icon"
            className={cn(
              "rounded-full p-2 h-16 w-16",
              conversationState === ConversationState.ACTIVE
                ? "bg-rose-600 hover:bg-rose-700"
                : conversationState === ConversationState.LOADING
                ? "bg-yellow-600 hover:bg-yellow-700"
                : "bg-blue-600 hover:bg-blue-700"
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
              <PhoneOff className="w-7 h-7" />
            ) : conversationState === ConversationState.LOADING ? (
              <LoaderIcon className="w-7 h-7 animate-spin" />
            ) : (
              <Phone className="w-7 h-7" />
            )}
          </Button>
          {/* Mic */}
          <Button
            variant="default"
            size="icon"
            className={cn(
              "rounded-full p-2 h-16 w-16",
              micIsEnabled ? "bg-blue-700 hover:bg-blue-800" : ""
            )}
            onClick={onMicTriggered}
            disabled={conversationState !== ConversationState.ACTIVE}
          >
            {micIsEnabled ? (
              <Mic className="w-7 h-7" />
            ) : (
              <MicOff className="w-7 h-7" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
