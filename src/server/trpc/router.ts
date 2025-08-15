import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/supabaseServerClient";
import { GoogleGenAI, Modality } from "@google/genai";
import { uploadToSupabaseBucket } from "@/lib/supabase/uploadToSupbaseStorage";

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.SHIVAAY_API_KEY,
  baseURL: 'https://api.futurixai.com/api/shivaay/v1'
});

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

      if (checkError) {
        console.error('Error checking existing user:', checkError);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to check existing user',
        });
      }


      if (existingUser) {
        console.log("User already exists:", existingUser);

        const { data, error } = await supabaseServer
          .from("ChatSession")
          .select(`
            id,
            created_at,
            title,
            lastMessage,
            userId,
            Message (
              id,
              created_at,
              content,
              fileUrl,
              role,
              chatSessionId
            )
          `)
          .eq("userId", existingUser.id);



        if (error) {
          console.error('Error fetching chat sessions:', error);
        }

        /* eslint-disable */

        console.log("Fetched chat sessions:", data);
        return {
          data: {
            user: existingUser,
            allChatSessions: Array.isArray(data)
              ? data.map(session => ({
                ...session,
                timestamp: session.created_at,
                messages: Array.isArray(session.Message)
                  ? session.Message.map((msg: any) => ({ ...msg, timestamp: msg.created_at }))
                  : [],
              }))
              : [],
          },
          message: "User already exists"
        };
      }


      console.log("Creating new user");
      const { data, error } = await supabaseServer
        .from("user")
        .insert({ email: input.email, username: input.name, pfp_url: input.picture })
        .select();
      if (error || !data) throw new Error(error?.message);
      console.log("User created:", data[0]);

      //create a new chat session for the user and return its id
      const { data: sessionData, error: sessionError } = await supabaseServer
        .from("ChatSession")
        .insert({ title: "Welcome Chat", userId: data[0].id, lastMessage: new Date() })
        .select("*");

      if (sessionError || !sessionData) throw new Error(sessionError?.message);

      console.log("Chat session created:", sessionData[0]);


      //create one assistant hello message in the same chat session
      const { data: messageData, error: messageError } = await supabaseServer
        .from("Message")
        .insert({
          content: "Hello! How can I assist you today?",
          chatSessionId: sessionData[0].id,
          role: "assistant"
        })
        .select("*");

      if (messageError || !messageData) throw new Error(messageError?.message);

      console.log("Assistant message created:", messageData[0]);

      return {
        data: {
          user: existingUser,
          allChatSessions: [{
            id: sessionData[0].id,
            title: sessionData[0].title,
            fileUrl: sessionData[0].file_url,
            timestamp: sessionData[0].created_at,
            lastMessage: sessionData[0].last_message,
            messages: [{ ...messageData[0], timestamp: messageData[0].created_at }]
          }]
        }, message: "User created/logged in successfully"
      };
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
        .insert({
          content: input.content,
          chatSessionId: input.chatSessionId,
          fileUrl: input.fileUrl ?? "",
          role: input.role
        }).select("*");

      if (error) throw new Error(error.message);
      console.log("Message created:", data[0]);
      return { data: { ...data[0], timestamp: data[0].created_at }, message: "Chat session created successfully" };
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
    .input(z.object({
      chatSessionId: z.number(),
      prompt: z.array(z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string()
      }))
    }))
    .mutation(async ({ input }) => {

      const { data: chatSession, error: sessionError } = await supabaseServer
        .from("ChatSession")
        .select("id")
        .eq("id", input.chatSessionId)
        .single();

      if (sessionError || !chatSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Chat session with ID ${input.chatSessionId} not found.`,
        });
      }

      // const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });
      // const response = await ai.models.generateContent({
      //   model: "gemini-2.5-flash",
      //   contents: input.prompt,
      //   config: {
      //     maxOutputTokens: 150,
      //   }
      // });

      const completion = await openai.chat.completions.create({
        model: "shivaay",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          ...input.prompt
        ],
      });

      const content = completion.choices[0].message

      if (!content) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate content",
        });
      }

      const message = await supabaseServer.from("Message").insert({
        content,
        fileUrl: "",
        role: "assistant",
        chatSessionId: input.chatSessionId
      }).select("*").single();

      console.log("Message saved:", message);

      return { ...message.data, timestamp: message.data.created_at }
    }),

  generateImage: t.procedure
    .input(
      z.object({
        chatSessionId: z.number(),
        prompt: z.string().min(3, { message: "Prompt must be at least 3 characters long." }),
      })
    )
    .mutation(async ({ input }) => {

      //check if chatSessionId exists
      const { data: chatSession, error: sessionError } = await supabaseServer
        .from("ChatSession")
        .select("id")
        .eq("id", input.chatSessionId)
        .single();

      if (sessionError || !chatSession) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Chat session with ID ${input.chatSessionId} not found.`,
        });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-preview-image-generation",
        contents: input.prompt,
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      let messageContent = "";

      if (
        response.candidates &&
        response.candidates[0] &&
        response.candidates[0].content &&
        response.candidates[0].content.parts
      ) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            console.log(part.text);
            messageContent += part.text;
          } else if (part.inlineData) {
            const imageData = part.inlineData.data;
            if (typeof imageData === "string") {
              const imageUrl = await uploadToSupabaseBucket(imageData)

              console.log("content:", messageContent)
              console.log("fileUrl:", imageUrl);
              console.log("chatSessionId:", input.chatSessionId);

              const message = await supabaseServer.from("Message").insert({
                content: messageContent,
                fileUrl: imageUrl,
                role: "assistant",
                chatSessionId: input.chatSessionId
              }).select("*").single();

              console.log("Message saved:", message);

              return { ...message.data, timestamp: message.data.created_at }
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

