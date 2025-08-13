"use client"

import type React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import favicon from "../../public/chatgpt.png"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  ArrowUp,
  X,
  MoreHorizontal,
  ImageIcon,
  Plus,
  MessageSquare,
  Menu,
  Trash
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/toggle-theme"
import { useAuth0 } from "@auth0/auth0-react"
import { NotAuthorisedDialogBox } from "@/components/dialogBox"
import { trpc } from "@/util/trpc"
import { toast } from "sonner"
import { PageLoader } from "@/components/pageLoader"



interface Message {
  id: string
  content?: string
  fileUrl?: string,
  role: "user" | "assistant"
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  lastMessage: Date
}

interface userState {
  pfp_url: string,
  email: string,
  username: string,
  id: number
}

type userStateFiltered = Partial<userState> | null

export default function ChatbotUI() {

  const [userState, setUserState] = useState<userStateFiltered>()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: "1",
      title: "Getting Started",
      messages: [
        {
          id: "1",
          content: "Hello! How can I help you today?",
          role: "assistant",
          timestamp: new Date(Date.now() - 1000 * 60 * 30)
        }
      ],
      lastMessage: new Date(Date.now() - 1000 * 60 * 30)
    },
    {
      id: "2",
      title: "Web Development Tips",
      messages: [
        {
          id: "2",
          content: "Can you help me with React components?",
          role: "user",
          timestamp: new Date(Date.now() - 1000 * 60 * 60)
        },
        {
          id: "3",
          content:
            "Of course! I'd be happy to help you with React components. What specific aspect would you like to learn about?",
          role: "assistant",
          timestamp: new Date(Date.now() - 1000 * 60 * 58)
        }
      ],
      lastMessage: new Date(Date.now() - 1000 * 60 * 58)
    }
  ])

  const [activeSessionId, setActiveSessionId] = useState<string>("1")
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [textareaRows, setTextareaRows] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)

  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false)
  const activeSession = chatSessions.find((s) => s.id === activeSessionId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages, activeSessionId])


  const handleSubmit = async () => {
    sendMessage();
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: "New Chat",
      messages: [],
      lastMessage: new Date()
    }
    setChatSessions((prev) => [newSession, ...prev])
    setActiveSessionId(newSession.id)
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textareaLineHeight = 20
    e.target.rows = 1
    const currentRows = Math.floor(e.target.scrollHeight / textareaLineHeight)

    if (currentRows >= 5) {
      e.target.rows = 5
      e.target.scrollTop = e.target.scrollHeight
    } else {
      e.target.rows = currentRows
    }

    setTextareaRows(currentRows < 5 ? currentRows : 5)
    setInputValue(e.target.value)
  }


  const generateImageMutation = trpc.generateImage.useMutation({
    onSuccess: (data) => {
      console.log("Image generated successfully:", data);
      // You may want to add this message to the chat session here
    }
  });

  const generateTextMutation = trpc.generateText.useMutation({
    onSuccess: (data) => {
      console.log("Text generated successfully:", data);
      // You may want to add this message to the chat session here
    }
  });

  const sendMessage = async () => {
    if (imageGenerationEnabled) {
     
      generateImageMutation.mutate({ prompt: inputValue });
    }
    else {
      generateTextMutation.mutate({ prompt: inputValue });
    }
     setInputValue("")
  }

  const {
    isLoading,
    isAuthenticated,
    error,
    loginWithRedirect: login,
    logout: auth0Logout,
    user,
  } = useAuth0();

  const signup = () =>
    login({ authorizationParams: { screen_hint: "signup" } });

  const logout = () =>
    auth0Logout({ logoutParams: { returnTo: window.location.origin } });


  const createUserMutation = trpc.createUser.useMutation({
    onSuccess: (data) => {
      console.log("Mutation succeeded! Message from server:", data.message);
      console.log("User Profile:", data.data);
      if (data.message === "User already exists") {
        toast.success("Logged in successfully")
      } else {
        toast.success("Signed up sucessfully")
      }
      setUserState(data.data)
    },

    onError: (error) => {
      console.error("An unexpected error occurred:", error.message);
    },
  });

  useEffect(() => {
    const handleLogin = async () => {
      if (!user?.email) return;

      try {
        const result = await createUserMutation.mutateAsync({
          email: user.email,
          name: user.name || "User",
          picture: user.picture || "https://www.tubespace.studio/assets/pfp-D0tydQpd.png",
        });

      } catch (error) {
        console.error("Mutation failed:", error);
      }
    };

    handleLogin();
  }, [isAuthenticated, user]);

  return (
    <>
      < PageLoader isLoading={isLoading} onComplete={() => { }} />
      {!isLoading && <div className="flex h-screen bg-background text-foreground">
        <div
          className="cursor-pointer z-20 absolute top-[3px] left-10"
        >
          <img src={"/chatgpt.png"} alt="Logo" className="w-9 h-9" />
        </div>
        {!isAuthenticated && <div
          className="fixed top-0 left-0 w-full h-full bg-background/70 flex items-center justify-center z-50"
        >
          <NotAuthorisedDialogBox login={login} signup={signup} /></div>}
        {/* Sidebar Toggle */}
        <div className="cursor-pointer z-20 absolute top-2 right-2" > <ModeToggle /></div>
        <div
          onClick={() => setSidebarOpen((p) => !p)}
          className="cursor-pointer z-20 absolute top-2 left-2"
        >
          {sidebarOpen ? <X /> : <Menu />}
        </div>

        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -350 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-80 fixed z-10 top-0 left-0 min-h-screen py-10 bg-sidebar border-r border-sidebar-border flex flex-col"
            >
              {/* New Chat */}
              <div className="p-4 border-b border-sidebar-border">
                <Button
                  onClick={createNewChat}
                  className="w-full justify-start gap-2 bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground"
                  variant="ghost"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </Button>
              </div>

              {/* Chat History */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-1">
                  {chatSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => setActiveSessionId(session.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors group hover:bg-accent",
                        activeSessionId === session.id && "bg-accent"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {session.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(session.lastMessage)}
                          </p>
                        </div>
                        <Trash className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>

              {/* User Profile */}
              <div className="p-4 border-t border-sidebar-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={userState?.pfp_url} alt={userState?.username} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {userState?.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{userState?.username}</span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={logout}
                        className="text-destructive">
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col pt-10">
          <ScrollArea className="flex-1 p-4">
            <div className="max-w-3xl mx-auto space-y-6">
              {activeSession?.messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-4",
                    message.role === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {message.role === "assistant" && (

                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarImage src={"/chatgpt.png"} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-2xl px-4 py-3 text-sm border border-border",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground ml-auto"
                        : "bg-card text-card-foreground"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-2 opacity-70",
                        message.role === "user"
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground"
                      )}
                    >
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                  {message.role === "user" && (
                    <Avatar className="w-8 h-8 mt-1">
                      <AvatarImage src={userState?.pfp_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {userState?.username?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-4 justify-start">
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      AI
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-card border border-border rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative flex flex-col gap-2 bg-card rounded-2xl border border-border p-2">
                <Textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
                  rows={textareaRows}
                />
                <div className="flex gap-1 justify-end">
                  <Button
                    onClick={() => setImageGenerationEnabled(prev => !prev)}
                    size="sm"
                    className={`p-0 rounded-full bg-muted  hover:bg-muted cursor-pointer border text-muted-foreground ${imageGenerationEnabled && "bg-purple-500 hover:bg-purple-500 dark:bg-amber-300 dark:hover:bg-amber-300 text-background/90"}`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <p>Generate Image</p>
                  </Button>

                  <Button
                    onClick={handleSubmit}
                    disabled={!inputValue.trim()}
                    size="sm"
                    className="w-8 h-8 p-0 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:border-primary border disabled:text-muted-foreground"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>}
    </>
  )
}
