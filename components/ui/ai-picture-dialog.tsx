"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent } from "./dialog";
import { Button } from "./button";
import { GeistSans } from "geist/font/sans";
export default function AiPictureDialog({
  open,
  setOpen,
  pictureDescriptionCallback,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  pictureDescriptionCallback?: (description: string | null) => void;
}) {
  const [page, setPage] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [didTriggerPicture, setDidTriggerPicture] = useState(false);

  useEffect(() => {
    // Reset page when dialog is closed
    if (!open) {
      setPage(0);
      setCountdown(0);
      setDidTriggerPicture(false);
      setIsWebcamActive(false);
    }
  }, [open]);

  useEffect(() => {
    console.log("countdown", countdown);
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    } else if (
      countdown === 0 &&
      page === 1 &&
      didTriggerPicture &&
      isWebcamActive
    ) {
      capturePicture();
      setDidTriggerPicture(false);
    }
    return () => clearTimeout(timer);
  }, [countdown, page, isWebcamActive, didTriggerPicture]);

  const handleSkip = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setOpen(false);
    if (pictureDescriptionCallback) {
      pictureDescriptionCallback(null);
    }
    console.log("skipped");
  };

  const handleContinue = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setPage(page + 1);
    if (page === 0) {
      startWebcam();
    }
  };

  const handleBack = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setPage(page - 1);
    stopWebcam();
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsWebcamActive(true);
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      setIsWebcamActive(false);
    }
  };

  const handleTakePicture = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setDidTriggerPicture(true);
    setCountdown(3);
  };

  const capturePicture = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        context.drawImage(
          videoRef.current,
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
        const imageData = canvasRef.current.toDataURL("image/jpeg");
        const description = await processPicture(imageData);
        if (pictureDescriptionCallback) {
          pictureDescriptionCallback(description);
        }
        setOpen(false);
        stopWebcam();
      }
    }
  };

  const processPicture = async (imageData: string): Promise<string> => {
    const response = await fetch("/api/llava", {
      method: "POST",
      body: JSON.stringify({ imageData }),
    });
    const { analysis } = await response.json();
    return analysis;
  };

  const handleOpenChange = (newOpen: boolean) => {
    console.log("About to close:", newOpen);
    setOpen(newOpen);
    if (!newOpen) {
      stopWebcam();
      setPage(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()} className={GeistSans.className}>
        <h2 className="text-lg font-semibold">Requesting picture</h2>
        <p className="text-sm text-gray-500">
          {page === 0 ? (
            <>
              Aria is requesting a picture of your condition for more context.
            </>
          ) : (
            <>
              {countdown > 0
                ? `Taking picture in ${countdown}...`
                : "Ready to take picture"}
            </>
          )}
        </p>
        {page === 1 && (
          <div className="flex flex-col items-center">
            <video ref={videoRef} autoPlay playsInline muted className="mb-4" />
            <canvas
              ref={canvasRef}
              style={{ display: "none" }}
              width={640}
              height={480}
            />
          </div>
        )}
        <div className="flex justify-end gap-2 mt-4">
          {page === 0 ? (
            <>
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleContinue}>Continue</Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={countdown > 0}
              >
                Back
              </Button>
              <Button
                onClick={handleTakePicture}
                disabled={countdown > 0 || !isWebcamActive}
              >
                Take Picture
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
