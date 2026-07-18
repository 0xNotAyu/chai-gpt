import {createOpenAI, openai} from '@ai-sdk/openai'


const LLM = createOpenAI({
    baseURL: 'https://aicredits.in/v1',
    apiKey: process.env.OPENAI_API_KEY
})

export const DEFAULT_CHAT_MODEL = 'gpt-4o-mini'

export function getChatModel(modelId?:string | null){
    return LLM(modelId || DEFAULT_CHAT_MODEL)
}