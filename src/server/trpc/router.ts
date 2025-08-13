import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/supabaseServerClient";
import { GoogleGenAI, Modality } from "@google/genai";
import { uploadToSupabaseBucket } from "@/lib/supabase/uploadToSupbaseStorage";

const t = initTRPC.create();

export const appRouter = t.router({
  getUsers: t.procedure.query(async () => {
    const { data, error } = await supabaseServer.from("user").select("*");
    if (error) throw new Error(error.message);
    return data;
  }),

  createUser: t.procedure
    .input(z.object({ email: z.string().email(), name: z.string().min(1), picture: z.string().url() }))
    .mutation(async ({ input }) => {

      const { data: existingUser, error: checkError } = await supabaseServer
        .from("user")
        .select("*")
        .eq("email", input.email)
        .maybeSingle();

      if (existingUser) {
        return { data: existingUser, message: "User already exists" };
      }

      const { data, error } = await supabaseServer
        .from("user")
        .insert({ email: input.email, username: input.name, pfp_url: input.picture });
      if (error) throw new Error(error.message);
      return { data, message: "User created/logged in successfully" };
    }),

  createChatSession: t.procedure
    .input(z.object({ title: z.string().min(1), lastMessage: z.date() }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabaseServer
        .from("ChatSession")
        .insert({ title: input.title, last_message: input.lastMessage });
      if (error) throw new Error(error.message);
      return { data, message: "Chat session created successfully" };
    }),

  deleteChatSession: t.procedure
    .input(z.object({ chatSessionId: z.int() }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabaseServer
        .from("ChatSession")
        .delete()
        .eq("id", input.chatSessionId);
      if (error) throw new Error(error.message);
      return { data, message: "Chat session deleted successfully" };
    }),

  createMessage: t.procedure
    .input(z.object({
      content: z.string().min(1).optional(),
      chatSessionId: z.int(),
      fileUrl: z.string().optional(),
      role: z.string().min(1)
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabaseServer
        .from("Message")
        .insert({ content: input.content, chat_session_id: input.chatSessionId, fileUrl: input.fileUrl ?? "", role: input.role });
      if (error) throw new Error(error.message);
      return { data, message: "Chat session created successfully" };
    }),

  fetchMessages: t.procedure
    .input(z.object({
      chatSessionId: z.int(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabaseServer.from("Message")
        .select("*")
        .eq("chatSessionId", input.chatSessionId)
      if (error) throw new Error(error.message);
      return data;
    }),

  fetchChatSessions: t.procedure
    .input(z.object({
      userId: z.int(),
    }))
    .query(async ({ input }) => {
      const { data, error } = await supabaseServer.from("user")
        .select("*")
        .eq("userId", input.userId)
      if (error) throw new Error(error.message);
      return data;
    }),


  generateText: t.procedure
    .input(z.object({ prompt: z.string().min(3, { message: "Prompt must be at least 3 characters long." }) }))
    .mutation(async ({ input }) => {
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: input.prompt,
      });

      if (!response || !response.text) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate content",
        });
      }

      return response.text;
    }),

  generateImage: t.procedure
    .input(
      z.object({
        prompt: z.string().min(3, { message: "Prompt must be at least 3 characters long." }),
      })
    )

    .mutation(async ({ input }) => {

      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: input.prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      if (
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts
      ) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            console.log(part.text);
          } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            if (typeof imageData === "string") {
              const imageUrl = await uploadToSupabaseBucket(imageData)
              console.log("image url:", imageUrl);
              return { imageUrl, text: part.text }
            } else {
              console.warn("No image data found to save.");
            }
          }
        }
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to generate content",
      });


    }),
});

export type AppRouter = typeof appRouter;

