"use client"
import { v4 as uuidv4 } from 'uuid';
import type React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  MessageSquare,
  Menu,
  LoaderIcon,
  Loader2,
  Download,
  EllipsisVertical
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/toggle-theme"
import { useAuth0 } from "@auth0/auth0-react"
import { NotAuthorisedDialogBox } from "@/components/dialogBox"
import { trpc } from "@/util/trpc"
import { toast } from "sonner"
import { PageLoader } from "@/components/pageLoader"
import { ChatSession, formatTime, userStateFiltered } from '@/util/chatbotUtility';

import Image from "next/image"

export default function ChatbotUI() {

  const [userState, setUserState] = useState<userStateFiltered>()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [fetchedUserData, setFetchedUserData] = useState(true)
  const [creatingUserMsg, setCreatingUserMsg] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null | undefined>(null); // ✨ NEW/MODIFIED: State for enlarged image URL


  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [textareaRows, setTextareaRows] = useState(1)

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

  const [imageGenerationEnabled, setImageGenerationEnabled] = useState(false)
  const activeSession = chatSessions.find((s) => s.id === activeSessionId)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages, activeSessionId, creatingUserMsg])


  const handleDownloadImage = async (url: string) => {
    if (!url) return;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Network response was not ok.");
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = `midgpt-image-${uuidv4()}.png`; // Uses uuid for a unique filename
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success("Image download started!");
    } catch (error) {
      console.error("Could not download the image:", error);
      toast.error("Image download failed.");
    }
  };

  const handleSubmit = async () => {
    if (inputValue?.trim() === "" || creatingUserMsg || isTyping) {
      console.log("TextArea disabled")
      return;
    }
    sendMessage();
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const generateImageMutation = trpc.generateImage.useMutation({
    onSuccess: (data) => {
      console.log("Image generated successfully:", data);
      setChatSessions(prev => {
        const newState = prev.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: data.id,
                  content: data.content,
                  fileUrl: data.fileUrl,
                  role: data.role,
                  timestamp: data.timestamp
                }
              ]
            }
          }
          return session
        })
        return newState
      })
    }
  });

  const generateTextMutation = trpc.generateText.useMutation({
    onSuccess: (data) => {
      console.log("Text generated successfully:", data);
      setChatSessions(prev => {
        const newState = prev.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: data.id,
                  content: data.content,
                  fileUrl: data.fileUrl,
                  role: data.role,
                  timestamp: data.timestamp
                }
              ]
            }
          }
          return session
        })
        return newState
      })
    },
    onError: (error) => {
      console.error("Error generating text:", error);
      toast.error("Failed to generate text. Please try again.");
    }
  });

  const createMessageMutation = trpc.createMessage.useMutation({
    onSuccess: (data) => {
      console.log("Message created successfully:", data);
      setChatSessions(prev => {
        const newState = prev.map(session => {
          if (session.id === activeSessionId) {
            return {
              ...session,
              messages: [
                ...session.messages,
                {
                  id: data.data.id,
                  content: data.data.content,
                  fileUrl: data.data.fileUrl,
                  role: data.data.role,
                  timestamp: data.data.timestamp
                }
              ]
            }
          }
          return session
        })
        return newState
      })
    },
    onError: (error) => {
      console.error("Error creating message:", error);
      toast.error("Failed to send message. Please try again.");
    }
  });


  const sendMessage = async () => {
    if (!activeSessionId) {
      toast.error("No active chat session found. Please start a new chat.")
      return;
    }
    console.log("Sending message:", inputValue);

    setCreatingUserMsg(true)
    setInputValue("")

    await createMessageMutation.mutateAsync({ content: inputValue, fileUrl: "", role: "user", chatSessionId: activeSessionId });
    setIsTyping(true);
    setCreatingUserMsg(false)

    if (imageGenerationEnabled) {
      await generateImageMutation.mutateAsync({ prompt: inputValue, chatSessionId: activeSessionId });
    }
    else {
      //prompt 
      if (!activeSession) {
        console.error("no active session")
        return;
      }
      let appendedPrompt = ""
      for (const msg of activeSession?.messages) {
        appendedPrompt += `${msg.role === "user" ? "User" : "AI"}: ${msg.content}\n`
      }
      await generateTextMutation.mutateAsync({ prompt: appendedPrompt, chatSessionId: activeSessionId });
    }
    setIsTyping(false)
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
      console.log("User Profile:", data.data.user);
    },
    onError: (error) => {
      console.error("An unexpected error occurred:", error.message);
    },
  });

  // eslint-disable-next-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleLogin = async () => {
      if (!user?.email) return;
      setFetchedUserData(false)

      try {
        const result = await createUserMutation.mutateAsync({
          email: user.email,
          name: user.name || "User",
          picture: user.picture || "https://www.tubespace.studio/assets/pfp-D0tydQpd.png",
        });

        if (result.message === "User already exists") {
          toast.success("Logged in successfully")
        } else {
          toast.success("Signed up sucessfully")
        }
        setUserState(result.data.user)
        setChatSessions(result.data.allChatSessions);
        setActiveSessionId(result.data.allChatSessions[result.data.allChatSessions.length - 1]?.id);

      } catch (error) {
        console.error("Mutation failed:", error);
      }
      setFetchedUserData(true)
    };

    if (isAuthenticated) {
      handleLogin();
    }

  }, [isAuthenticated, user]);

  if (error) {
    console.error("Authentication error:", error);
    return <div className="text-destructive">Authentication failed. Please try again.</div>;
  }

  return (
    <>
      {!fetchedUserData && <SimpleLoader />}
      <PageLoader isLoading={isLoading} onComplete={() => { }} />

      {/* ✨ NEW/MODIFIED: Image Enlarge Modal */}
      <AnimatePresence>
        {enlargedImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEnlargedImageUrl(null)}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking on the content
              className="relative bg-card p-4 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] flex flex-col gap-4 cursor-default"
            >
              <Image
                src={enlargedImageUrl}
                alt="Enlarged view"
                className="object-contain w-full h-full max-w-full max-h-[calc(90vh-100px)]"
              />
              <div className="flex justify-center items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadImage(enlargedImageUrl)}
                  className="flex items-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEnlargedImageUrl(null)}
                  className="flex items-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Close
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {!isLoading && <div className="flex h-dvh bg-background text-foreground">
        <div
          className="cursor-pointer z-20 absolute top-[3px] left-10"
        >
          <Image src={"/chatgpt.png"}
            width={32} height={32}
            alt="Logo" />
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
              className="w-80 fixed z-10 top-0 left-0 min-h-dvh py-10 bg-sidebar border-r border-sidebar-border flex flex-col"
            >
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
                            {formatTime(session.timestamp)}
                          </p>
                        </div>
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
                      <AvatarImage src={"/chatgpt.png"}
                        width={32} height={32} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        AI
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className='flex flex-col gap-4'>
                    <div
                      className={cn(
                        "max-w-[70%] min-w-[200px] rounded-2xl px-4 py-3 text-sm border border-border ",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground ml-auto"
                          : "bg-card text-card-foreground"
                      )}
                    >
                      <p className="whitespace-pre-wrap w-full">{message.content} </p>
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


                    {message.fileUrl && message.fileUrl?.trim() !== "" && (
                      <div className='rounded-xl relative w-fit'>
                        <Image
                          src={message.fileUrl}
                          alt="Generated"
                          className="max-w-40 rounded-xl "

                        />
                        <EllipsisVertical
                          onClick={() => setEnlargedImageUrl(message.fileUrl)}
                          size={25} className='absolute bottom-1 cursor-pointer  p-1 bg-background/60 rounded-sm right-1' />
                      </div>
                    )}
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
              {creatingUserMsg && <div className='w-full flex justify-end items-center'>
                <Loader2 className=' animate-spin repeat-infinite' /></div>}

              {isTyping && (
                <div className="flex gap-4 justify-start">

                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarImage src="/chatgpt.png"
                      width={32} height={32}
                      alt={userState?.username} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      MidGPT
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
                    disabled={!inputValue.trim() || isTyping || creatingUserMsg}
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


const SimpleLoader = () => {
  return (<div className='h-dvh w-screen fixed z-50 bg-background/70 flex gap-2 flex-col justify-center items-center' >
    <h1>Just a Second...</h1>
    <LoaderIcon className='animate-spin repeat-infinite ease-in ' />
  </div>)
}