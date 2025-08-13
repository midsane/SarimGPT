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





