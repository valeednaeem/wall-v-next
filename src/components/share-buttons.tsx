"use client";

import { useState, useEffect } from "react";
import {
  Share2,
  Link as LinkIcon,
  Mail,
  Check,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ShareButtonsProps {
  url: string;
  title: string;
  text?: string;
  className?: string;
}

function getShareUrl(platform: string, url: string, title: string, text?: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedText = encodeURIComponent(text || title);

  switch (platform) {
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "linkedin":
      return `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodedTitle}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
    case "x":
      return `https://x.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`;
    case "email":
      return `mailto:?subject=${encodedTitle}&body=${encodedText}%0A%0A${encodedUrl}`;
    default:
      return "#";
  }
}

/** SVG icons for platforms not in lucide-react */
function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function LinkedinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: FacebookIcon,
  x: XIcon,
  linkedin: LinkedinIcon,
  whatsapp: MessageCircle,
  email: Mail,
};

const LABEL_MAP: Record<string, string> = {
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  whatsapp: "WhatsApp",
  email: "Email",
};

function ShareButton({
  platform,
  url,
  title,
  text,
}: {
  platform: string;
  url: string;
  title: string;
  text?: string;
}) {
  const Icon = ICON_MAP[platform];
  const label = LABEL_MAP[platform] || platform;
  const shareUrl = getShareUrl(platform, url, title, text);

  if (platform === "email") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" asChild>
            <a href={shareUrl} aria-label={`Share via ${label}`} title={`Share via ${label}`}>
              <Icon className="h-4 w-4" />
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" asChild>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share on ${label}`}
            title={`Share on ${label}`}
          >
            <Icon className="h-4 w-4" />
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

export function ShareButtons({ url, title, text, className }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [nativeSupported, setNativeSupported] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setNativeSupported(true);
    }
  }, []);

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text: text || title, url });
    } catch {
      // User cancelled or share failed — silently ignore
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: create a temporary input to copy
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className={className}>
        <Separator className="mb-6" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-2 shrink-0">
            <Share2 className="h-4 w-4" />
            Share
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {nativeSupported && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleNativeShare} aria-label="Share via device">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Share</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  aria-label={copied ? "Link copied" : "Copy link"}
                >
                  {copied ? <Check className="h-4 w-4 text-green-600" /> : <LinkIcon className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{copied ? "Copied!" : "Copy link"}</TooltipContent>
            </Tooltip>

            <ShareButton platform="facebook" url={url} title={title} text={text} />
            <ShareButton platform="x" url={url} title={title} text={text} />
            <ShareButton platform="linkedin" url={url} title={title} text={text} />
            <ShareButton platform="whatsapp" url={url} title={title} text={text} />
            <ShareButton platform="email" url={url} title={title} text={text} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
