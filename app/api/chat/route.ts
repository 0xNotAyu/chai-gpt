import { loadChatMessages, saveChatMessages } from "@/features/ai/action/chat-store";
import { getChatModel } from "@/features/ai/utils/model";
import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import {convertToModelMessages, createIdGenerator, createUIMessageStreamResponse, streamText, toUIMessageStream, type UIMessage} from 'ai'

export async function POST(req:Request){
    await auth.protect()

    const {message, id}: {message:UIMessage, id:string} = await req.json()

    if(!message || !id){
        return new Response("missing Conversation or id", {status: 400})
    }

    const user = await requireUser()

    const conversation = await prisma.conversation.findFirst({
        where: {
            id,
            userId: user.id
        }
    }) 

    if(!conversation){
        return new Response("Conversation not found", {status: 404})
    }

    const previousMessages = await loadChatMessages(id)

    const alreadyStored = previousMessages.some(
        (storedMessage) => storedMessage.id === message.id
    )

    const messages = alreadyStored ? previousMessages : [...previousMessages, message]

    if(!alreadyStored){
        await saveChatMessages(id, [message])
    }

    const result = streamText({
        model: getChatModel(conversation.model),
        system: conversation.systemPrompt ?? "You are a ChaiGPT, a helpful assistent",
        messages: await convertToModelMessages(messages)
    })

    result.consumeStream()
    
    return createUIMessageStreamResponse({
        stream:toUIMessageStream({
            stream: result.stream,
            originalMessages: messages,
            generateMessageId: createIdGenerator({prefix: 'msg', size: 16}),
            onEnd:async({messages:finalMessages})=>{
                try{
                    await saveChatMessages(id, finalMessages, {updateTitle: false})
                }
                catch  (error) {
                    console.error(error)
                }
            }
        })
    })
}