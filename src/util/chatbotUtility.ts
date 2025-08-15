export const formatTime = (input: string | number | Date | null | undefined) => {
  if (!input) return ""; // gracefully handle null/undefined

  let date: Date;

  // If already a Date
  if (input instanceof Date) {
    date = input;
  }
  // If number, detect if seconds or milliseconds
  else if (typeof input === "number") {
    date = new Date(input < 1e12 ? input * 1000 : input);
  }
  // If string
  else if (typeof input === "string") {
    date = new Date(input);
  }
  // If totally unrecognized
  else {
    return "";
  }

  // Check for invalid date
  if (isNaN(date.getTime())) return "";

  // Return time in HH:MM format (local time)
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export const downloadFile = async (url: string) => {
  if (!url) {
    toast.error("No URL provided for download.");
    return;
  }

  // Declare these before try so they're accessible in catch
  let fileExtension = 'bin'; // Default to a generic binary extension
  let fileTypeDescription = 'file';

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);

    // Determine file extension based on MIME type
    if (blob.type.startsWith('image/')) {
      if (blob.type === 'image/png') {
        fileExtension = 'png';
      } else if (blob.type === 'image/jpeg') {
        fileExtension = 'jpeg';
      } else if (blob.type === 'image/gif') {
        fileExtension = 'gif';
      } else if (blob.type === 'image/webp') {
        fileExtension = 'webp';
      }
      fileTypeDescription = 'image';
    } else if (blob.type.startsWith('video/')) {
      if (blob.type === 'video/mp4') {
        fileExtension = 'mp4';
      } else if (blob.type === 'video/webm') {
        fileExtension = 'webm';
      } else if (blob.type === 'video/quicktime') { // For .mov files
        fileExtension = 'mov';
      }
      fileTypeDescription = 'video';
    }

    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = `download-${fileTypeDescription}-${uuidv4()}.${fileExtension}`; // Unique filename with correct extension
    document.body.appendChild(a);
    a.click();

    window.URL.revokeObjectURL(blobUrl); // Clean up the object URL
    document.body.removeChild(a); // Clean up the anchor element

    toast.success(`${fileTypeDescription} download started!`);
  } catch (error) {
    console.error(`Could not download the ${fileTypeDescription}:`, error);
    toast.error(`${fileTypeDescription} download failed.`);
  }
};

export interface Message {
  id: number
  content?: string
  fileUrl?: string,
  role: "user" | "assistant"
  timestamp: Date
}

export interface ChatSession {
  id: number
  title: string
  messages: Message[]
  timestamp: Date
}

interface userState {
  pfp_url: string,
  email: string,
  username: string,
  id: number
}

export type userStateFiltered = Partial<userState> | null





