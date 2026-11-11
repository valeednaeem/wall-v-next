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
    case "pinterest":
      return `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`;
    case "telegram":
      return `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`;
    case "threads":
      return `https://www.threads.net/share?url=${encodedUrl}`;
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

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function PinterestIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.34-.776-.963-1.394-1.803-1.79-.128 2.754-1.19 5.072-4.426 5.072-.039 0-.079 0-.12-.002-3.346-.157-5.89-2.274-6.18-5.268-.023-.238-.04-.476-.042-.717.002-2.94 1.96-5.638 5.22-6.38.6-.137 1.214-.216 1.84-.234.476-.013.817.392.806.867-.01.443-.347.812-.787.833-1.51.073-2.96.534-4.05 1.428-1.29 1.064-2.072 2.598-2.052 4.278.036 3.092 2.545 5.32 5.81 5.469.068.003.136.005.204.006 2.314 0 4.07-1.27 4.98-3.248.325-.705.55-1.528.654-2.435.157-1.372-.077-2.872-.703-4.22.482.56.846 1.213 1.063 1.935.531 1.768.467 3.827-.268 5.753-.983 2.579-3.048 4.335-5.81 4.973-.473.108-.958.164-1.447.167zM16.27 16.275c-.438.36-.95.62-1.52.75-.384.089-.775.113-1.16.072-.68-.072-1.258-.356-1.68-.828-.217-.244-.384-.528-.496-.843-.053.383-.248.737-.582 1.002-.32.255-.72.397-1.167.42-.31.016-.588-.05-.834-.198-.604-.364-.992-1.013-1.025-1.733-.034-.738.31-1.48.942-2.028.463-.4 1.048-.667 1.677-.79.454-.09.917-.127 1.38-.11.327.012.627.14.878.382-.198-.32-.525-.522-.89-.542-.354-.02-.686.127-.916.418l-.014.018c-.235.3-.642.43-1.03.312-.378-.115-.63-.443-.683-.838-.053-.4.067-.816.332-1.132.426-.508 1.098-.805 1.813-.825.474-.013.937.076 1.374.277.75.348 1.34 1.002 1.627 1.882.134.412.208.843.221 1.276.013.438-.024.898-.11 1.382-.123.68-.357 1.337-.698 1.958l.037-.033z" />
    </svg>
  );
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  facebook: FacebookIcon,
  x: XIcon,
  linkedin: LinkedinIcon,
  instagram: InstagramIcon,
  whatsapp: MessageCircle,
  email: Mail,
  pinterest: PinterestIcon,
  telegram: TelegramIcon,
  reddit: RedditIcon,
  threads: ThreadsIcon,
};

const LABEL_MAP: Record<string, string> = {
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  email: "Email",
  pinterest: "Pinterest",
  telegram: "Telegram",
  reddit: "Reddit",
  threads: "Threads",
};

function ShareButton({
  platform,
  url,
  title,
  text,
  onInstagramShare,
}: {
  platform: string;
  url: string;
  title: string;
  text?: string;
  onInstagramShare?: () => void;
}) {
  const Icon = ICON_MAP[platform];
  const label = LABEL_MAP[platform] || platform;

  if (platform === "instagram") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" onClick={onInstagramShare} aria-label={`Share on ${label}`} title={`Share on ${label}`}>
            <Icon className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{label}</TooltipContent>
      </Tooltip>
    );
  }

  if (platform === "email") {
    const shareUrl = getShareUrl(platform, url, title, text);
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

  const shareUrl = getShareUrl(platform, url, title, text);
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
  const [instagramCopied, setInstagramCopied] = useState(false);

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

  const handleInstagramShare = async () => {
    const shareText = `${text || title}\n\n${url}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setInstagramCopied(true);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setTimeout(() => setInstagramCopied(false), 3000);
    } catch {
      const input = document.createElement("input");
      input.value = shareText;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setInstagramCopied(true);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setTimeout(() => setInstagramCopied(false), 3000);
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
            <ShareButton platform="instagram" url={url} title={title} text={text} onInstagramShare={handleInstagramShare} />
            <ShareButton platform="whatsapp" url={url} title={title} text={text} />
            <ShareButton platform="pinterest" url={url} title={title} text={text} />
            <ShareButton platform="telegram" url={url} title={title} text={text} />
            <ShareButton platform="reddit" url={url} title={title} text={text} />
            <ShareButton platform="threads" url={url} title={title} text={text} />
            <ShareButton platform="email" url={url} title={title} text={text} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
