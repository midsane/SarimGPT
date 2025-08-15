"use client"
import type React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useState, useRef, useEffect } from "react"
// import { useRouter } from 'next/navigation'
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
import { useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react'
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
  EllipsisVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ModeToggle } from "@/components/toggle-theme"
import { trpc } from "@/util/trpc"
import { toast } from "sonner"
import { PageLoader } from "@/components/pageLoader"
import { ChatSession, downloadFile, formatTime, userStateFiltered } from '@/util/chatbotUtility'
import Image from "next/image"
import { EmailAuthDialog } from "@/components/EmailAuthDialog"

enum generationType {
  IMAGE = "image",
  VIDEO = "video",
  TEXT = "text"
}

export default function ChatbotUI() {
  // --- STATE MANAGEMENT ---
  const [userState, setUserState] = useState<userStateFiltered>()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [fetchedUserData, setFetchedUserData] = useState(true)
  const [creatingUserMsg, setCreatingUserMsg] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null | undefined>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [textareaRows, setTextareaRows] = useState(1)
  const [generationState, setGenerationState] = useState<generationType>(generationType.TEXT)
  const [hasSyncedProfile, setHasSyncedProfile] = useState(false); // ✨ FIX for multiple toasts & sync issues

  // --- HOOKS ---
  const supabase = useSupabaseClient()
  const { session, isLoading } = useSessionContext()
  const user = session?.user
  const isAuthenticated = !!user
  // const router = useRouter()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const activeSession = chatSessions.find((s) => s.id === activeSessionId)

  // --- UI HANDLERS & EFFECTS ---
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textareaLineHeight = 20
    e.target.rows = 1
    const currentRows = Math.floor(e.target.scrollHeight / textareaLineHeight)
    e.target.rows = currentRows < 5 ? currentRows : 5
    setTextareaRows(currentRows < 5 ? currentRows : 5)
    setInputValue(e.target.value)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [activeSession?.messages, activeSessionId, creatingUserMsg])

  // --- TRPC MUTATIONS ---
  const commonOnSuccess = (newData: ChatSession['messages'][0]) => {
    setChatSessions(prev =>
      prev.map(session =>
        session.id === activeSessionId
          ? { ...session, messages: [...session.messages, newData] }
          : session
      )
    );
  };

  const generateImageMutation = trpc.generateImage.useMutation({
    onSuccess: commonOnSuccess,
    onError: (error) => toast.error("Failed to generate image: " + error.message),
  });

  const generateVideoMutation = trpc.generateVideo.useMutation({
    onSuccess: commonOnSuccess,
    onError: (error) => toast.error("Failed to generate video: " + error.message),
  });

  const generateTextMutation = trpc.generateText.useMutation({
    onSuccess: commonOnSuccess,
    onError: (error) => toast.error("Failed to generate text: " + error.message),
  });

  const createMessageMutation = trpc.createMessage.useMutation({
    onSuccess: (data) => commonOnSuccess(data.data),
    onError: (error) => toast.error("Failed to send message: " + error.message),
  });

  const createUserMutation = trpc.createUser.useMutation({
    onSuccess: (data) => {
      // ✨ FIX: Sort messages within each session by timestamp on initial load
      const sortedSessions = data.data.allChatSessions.map(session => ({
        ...session,
        messages: session.messages.sort((a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      }));

      setUserState(data.data.user);
      setChatSessions(sortedSessions);
      if (sortedSessions.length > 0) {
        setActiveSessionId(sortedSessions[sortedSessions.length - 1]?.id);
      }
    },
    onError: (error) => {
      console.log("erro:", error)
    },
  });

  // --- CORE LOGIC ---
  const sendMessage = async () => {
    if (!activeSessionId) {
      toast.error("No active chat session found. Please start a new chat.");
      return;
    }
    const content = inputValue.trim();
    if (content === "" || creatingUserMsg || isTyping) return;

    setCreatingUserMsg(true);
    setInputValue("");

    await createMessageMutation.mutateAsync({ content, fileUrl: "", role: "user", chatSessionId: activeSessionId });
    setIsTyping(true);
    setCreatingUserMsg(false);

    if (generationState === generationType.IMAGE) {
      await generateImageMutation.mutateAsync({ prompt: content, chatSessionId: activeSessionId });
    } else if (generationState === generationType.VIDEO) {
      await generateVideoMutation.mutateAsync({ prompt: content, chatSessionId: activeSessionId });
    } else {
      const appendedPrompt = activeSession?.messages.map(msg => ({
        role: msg.role,
        content: msg.content ?? "",
      })) ?? [];
      await generateTextMutation.mutateAsync({ prompt: appendedPrompt, chatSessionId: activeSessionId });
    }
    setIsTyping(false);
  };

  const handleSubmit = () => sendMessage();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // --- AUTHENTICATION ---
  const handleSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) toast.error(error.message);
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) toast.error(error.message);
  };

  const handleSignUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
    } else if (data.session === null) {
      toast.info("Please check your email to confirm your sign-up.");
    } else {
      toast.success("Account created successfully!");
    }
  };

  // ✨ FIX: Robust logout using Next.js router
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Logout failed: " + error.message);
    }
    window.location.reload();
  };

  // In ChatbotUI.tsx

  useEffect(() => {
    const syncUserProfile = async () => {
      if (!user?.email || hasSyncedProfile) return;

      setHasSyncedProfile(true);
      setFetchedUserData(false);
      // eslint-disable-next-line no-useless-catch
      try {
        const result = await createUserMutation.mutateAsync({
          email: user.email,
          name: user.user_metadata.full_name || user.email.split('@')[0] || "User",

          picture: user.user_metadata.avatar_url || `https://sarim-gpt.vercel.app/nopfp.png`,
        });

        if (result.message !== "User already exists") {
          toast.success("Welcome!");
        } else {
          toast.success("Welcome back!");
        }
      } catch (error: unknown) {
        setHasSyncedProfile(false);
        if (error instanceof Error) {
          // Now TypeScript knows `error` has a `message` property
          console.error("An unexpected error occurred:", error.message);
          toast.error("Failed to sync user profile.");
        } else {
          // Handle cases where the thrown value is not an Error object
          console.error("An unexpected, non-error value was thrown:", error);
          toast.error("An unknown error occurred while syncing user profile.");
        }
      } finally {
        setFetchedUserData(true);
      }
    };

    if (isAuthenticated && user) {
      syncUserProfile();
    }

    if (!isAuthenticated) {
      setHasSyncedProfile(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  return (
    <>
      {!fetchedUserData && <SimpleLoader />}
      <PageLoader isLoading={isLoading} onComplete={() => { }} />

      {/* The main UI is now protected by both `!isLoading` AND `isAuthenticated` */}
      {!isLoading && isAuthenticated && (
        <div className="flex h-dvh bg-background text-foreground">
          <div className="cursor-pointer z-20 absolute top-[3px] left-10">
            <Image src="/chatgpt.png" className='rounded-md' width={32} height={32} alt="Logo" />
          </div>

          <div className="cursor-pointer z-20 absolute top-2 right-2" > <ModeToggle /></div>
          <div onClick={() => setSidebarOpen((p) => !p)} className="cursor-pointer z-20 absolute top-2 left-2">
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
                        className={cn("w-full text-left p-3 rounded-lg transition-colors group hover:bg-accent", activeSessionId === session.id && "bg-accent")}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session.title}</p>
                            <p className="text-xs text-muted-foreground">{formatTime(session.timestamp)}</p>
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
                          {userState?.username?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{userState?.username}</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-8 h-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={logout} className="text-destructive">Logout</DropdownMenuItem>
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
                  <div key={message.id} className={cn("flex gap-4", message.role === "user" ? "justify-end" : "justify-start")}>
                    {message.role === "assistant" && (<Avatar className="w-8 h-8 mt-1"><AvatarImage src={"/chatgpt.png"} width={32} height={32} /><AvatarFallback className="bg-primary text-primary-foreground text-sm">AI</AvatarFallback></Avatar>)}
                    <div className='flex flex-col gap-4'>
                      <div className={cn("max-w-[70%] min-w-[200px] rounded-2xl px-4 py-3 text-sm border border-border ", message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-card text-card-foreground")}>
                        <p className="whitespace-pre-wrap w-full">{message.content} </p>
                        <p className={cn("text-xs mt-2 opacity-70", message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground")}>{formatTime(message.timestamp)}</p>
                      </div>
                      {message.fileUrl && message.fileUrl?.trim() !== "" && (
                        <div className='rounded-xl relative w-fit'>
                          <Image width={200} height={200} src={message.fileUrl || ""} alt="Generated" className="max-w-40 rounded-sm" />
                          <EllipsisVertical onClick={() => setEnlargedImageUrl(message.fileUrl)} size={25} className='absolute bottom-1 cursor-pointer p-1 bg-background/60 rounded-sm right-1' />
                        </div>
                      )}
                    </div>
                    {message.role === "user" && (<Avatar className="w-8 h-8 mt-1"><AvatarImage src={userState?.pfp_url} /><AvatarFallback className="bg-primary text-primary-foreground text-sm">{userState?.username?.charAt(0)}</AvatarFallback></Avatar>)}
                  </div>
                ))}
                {creatingUserMsg && <div className='w-full flex justify-end items-center'><Loader2 className=' animate-spin repeat-infinite' /></div>}
                {isTyping && (
                  <div className="flex gap-4 justify-start">
                    <Avatar className="w-8 h-8 mt-1"><AvatarImage src="/chatgpt.png" width={32} height={32} alt={userState?.username} /><AvatarFallback className="bg-primary text-primary-foreground text-sm">AI</AvatarFallback></Avatar>
                    <div className="bg-card border border-border rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-4">
              <div className="max-w-3xl mx-auto">
                {/* ✨ FIX: RESTORED THE INPUT AREA WITH GENERATION BUTTONS */}
                <div className="relative flex flex-col gap-2 bg-card rounded-2xl border border-border p-2">
                  <Textarea ref={textareaRef} value={inputValue} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder="Type your message..." className="flex-1 min-h-[44px] max-h-32 resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-sm" rows={textareaRows} />
                  <div className="flex gap-2 justify-end">
                    <Button onClick={() => setGenerationState(p => p === generationType.IMAGE ? generationType.TEXT : generationType.IMAGE)} size="sm" className={`p-0 rounded-full bg-muted hover:bg-muted cursor-pointer border text-muted-foreground ${generationState === generationType.IMAGE && "bg-purple-500 hover:bg-purple-500 dark:bg-amber-300 dark:hover:bg-amber-300 text-background/90"}`}>
                      <ImageIcon className="w-4 h-4" />
                      <p>Image</p>
                    </Button>
                    {/* <Button onClick={() => setGenerationState(p => p === generationType.VIDEO ? generationType.TEXT : generationType.VIDEO)} size="sm" className={`p-0 rounded-full bg-muted hover:bg-muted cursor-pointer border text-muted-foreground ${generationState === generationType.VIDEO && "bg-purple-500 hover:bg-purple-500 dark:bg-amber-300 dark:hover:bg-amber-300 text-background/90"}`}>
                      <VideoIcon className="w-4 h-4" />
                      <p>Video </p>
                    </Button> */}
                    <Button onClick={handleSubmit} disabled={!inputValue.trim() || isTyping || creatingUserMsg} size="sm" className="w-8 h-8 p-0 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:border-primary border disabled:text-muted-foreground">
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Renders the Auth Dialog only when loading is finished and user is NOT authenticated */}
      {!isLoading && !isAuthenticated && (
        <EmailAuthDialog
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          onGoogleSignIn={handleGoogleSignIn}
        />
      )}

      {/* AnimatePresence for enlarged image modal (can be outside the main div) */}
      <AnimatePresence>
        {enlargedImageUrl && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEnlargedImageUrl(null)} className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 cursor-zoom-out">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()} className="relative bg-card p-4 rounded-xl shadow-2xl max-w-4xl max-h-[90vh] flex flex-col gap-4 cursor-default">
              {(() => {
                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(enlargedImageUrl || "");
                if (isImage) {
                  return <Image width={700} height={700} src={enlargedImageUrl} alt="Enlarged view" className="object-contain w-full h-full max-w-full max-h-[calc(90vh-100px)]" />
                }
                // Video logic here
                return null;
              })()}
              <div className="flex justify-center items-center gap-4">
                <Button variant="outline" onClick={() => downloadFile(enlargedImageUrl)} className="flex items-center gap-2"><Download className="w-5 h-5" />Download</Button>
                <Button variant="secondary" onClick={() => setEnlargedImageUrl(null)} className="flex items-center gap-2"><X className="w-5 h-5" />Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

const SimpleLoader = () => {
  return (
    <div className='h-dvh w-screen fixed z-50 bg-background/70 flex gap-2 flex-col justify-center items-center'>
      <h1>Just a Second...</h1>
      <LoaderIcon className='animate-spin repeat-infinite ease-in' />
    </div>
  )
}