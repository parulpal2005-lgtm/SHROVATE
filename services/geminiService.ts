import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { WebSource } from "../types";

// Note: Ensure process.env.API_KEY is set in your environment.
const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

export type AIMode = 'turbo' | 'standard' | 'thinking';

interface GeminiResponse {
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  audioData?: string;
  webSources?: WebSource[];
}

export const transcribeAudio = async (audioBase64: string, mimeType: string): Promise<string> => {
  if (!API_KEY) throw new Error("API Key not found.");
  
  try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: {
              parts: [
                  { inlineData: { mimeType: mimeType, data: audioBase64 } },
                  { text: "Transcribe this audio precisely. Return only the text." }
              ]
          }
      });
      return response.text || "";
  } catch (e) {
      console.error("Transcription error", e);
      throw e;
  }
};

export const sendMessageToGemini = async (
  prompt: string, 
  isVoiceMode: boolean = false,
  mode: AIMode = 'standard',
  inputMedia?: { data: string, mimeType: string }
): Promise<GeminiResponse> => {
  if (!API_KEY) {
    throw new Error("API Key not found. Please configure process.env.API_KEY.");
  }

  try {
    // Dynamic System Instruction Construction
    let systemInstruction = `You are **SHROVATE**, a friendly and simple Hinglish-speaking AI helper.

### 1. LANGUAGE MODE
- If the user types in **Hindi or Hinglish**, reply in **Hinglish**.
- If the user types in **English**, reply in **English**.
- Automatically detect the user's language.

### 2. TONE + STYLE
- Speak like a real human: short sentences, slightly casual, friendly, and clear.
- Explain like a teacher but in simple everyday language.

### 3. PHYSICS & SCIENCE (VISUAL + REAL WORLD)
When the user asks any question related to **physics**:
- **Real-World Examples**: MANDATORY.
- **Visual Generation**: ALWAYS generate a futuristic schematic diagram by appending this tag:
  [GENERATE_IMAGE: <detailed description>]

### 4. VIDEO GENERATION PROTOCOL
If the user explicitly asks to "generate a video", "create a video", or "make a video of X":
- Do NOT generate an image.
- Append this specific tag at the end of your response:
  [GENERATE_VIDEO: <concise video prompt>]
- Keep the video prompt descriptive but under 200 characters.

### 5. VOICE COMMAND PROTOCOL
- If the user says: "Voice on", "Listen", "Speak": Activate voice-friendly mode.
`;

    // Append Context-Specific Mode Instruction
    if (isVoiceMode) {
      systemInstruction += `\n\n[SYSTEM STATE: VOICE MODE ACTIVE]\n- Keep answers SHORT, SPOKEN-STYLE, and CONVERSATIONAL.`;
    }

    let text = "";
    let imageUrl: string | undefined;
    let videoUrl: string | undefined;
    let audioData: string | undefined;
    let webSources: WebSource[] | undefined;

    // --- BRANCH: MULTIMODAL INPUT (IMAGE OR VIDEO ANALYSIS/EDITING) ---
    if (inputMedia) {
        const isVideo = inputMedia.mimeType.startsWith('video/');
        
        if (isVideo) {
            // Video Understanding -> Gemini 3 Pro
            // "Video understanding ... using model gemini-3-pro-preview"
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', 
                contents: {
                    parts: [
                        { inlineData: { mimeType: inputMedia.mimeType, data: inputMedia.data } },
                        { text: prompt || "Analyze this video and describe what is happening in detail." }
                    ]
                },
                config: { systemInstruction }
            });
            text = response.text || "Video analysis complete.";
        } else {
            // Image Input: Check for Edit vs Analysis intent
            const lowerPrompt = (prompt || "").toLowerCase();
            const editKeywords = ["edit", "add", "remove", "change", "filter", "style", "make", "turn", "background"];
            const isEditRequest = editKeywords.some(kw => lowerPrompt.includes(kw));

            if (isEditRequest) {
                // Image Editing -> Gemini 2.5 Flash Image (Nano banana)
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash-image',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: inputMedia.mimeType, data: inputMedia.data } },
                            { text: prompt || "Edit this image" }
                        ]
                    }
                });
                
                // Extract Generated Image
                if (response.candidates?.[0]?.content?.parts) {
                    for (const part of response.candidates[0].content.parts) {
                        if (part.inlineData) {
                            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        } else if (part.text) {
                            text += part.text;
                        }
                    }
                }
                if (!text) text = "Image edit complete.";
            } else {
                // Image Analysis -> Gemini 3 Pro
                // "Analyze images ... using model gemini-3-pro-preview"
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview', 
                    contents: {
                        parts: [
                            { inlineData: { mimeType: inputMedia.mimeType, data: inputMedia.data } },
                            { text: prompt || "Analyze this image in detail." }
                        ]
                    },
                    config: { systemInstruction }
                });
                text = response.text || "Analysis complete.";
            }
        }
    } 
    // --- BRANCH: TEXT ONLY ---
    else {
        // Select Model Configuration
        let modelName = 'gemini-2.5-flash';
        let config: any = { systemInstruction };

        if (mode === 'turbo') {
            modelName = 'gemini-2.5-flash-lite';
        } else if (mode === 'thinking') {
            // "Think more when needed": Use gemini-3-pro-preview with max budget
            modelName = 'gemini-3-pro-preview';
            // Ensure no tools are active during thinking mode if mutually exclusive,
            // though prompt didn't forbid tools, usually thinking is standalone.
            // Max Thinking Budget for Pro is 32768
            config.thinkingConfig = { thinkingBudget: 32768 }; 
        } else {
            // Standard mode gets Google Search (Grounding)
            config.tools = [{ googleSearch: {} }];
        }

        // 1. Get Text Response
        const textResponse: GenerateContentResponse = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: config
        });

        text = textResponse.text || "System Error: Empty response received.";

        // Extract Grounding Metadata
        if (textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks) {
            webSources = textResponse.candidates[0].groundingMetadata.groundingChunks
                .map((chunk: any) => ({
                    uri: chunk.web?.uri,
                    title: chunk.web?.title
                }))
                .filter((s: any) => s.uri);
        }

        // 2. Check for Image Generation Tag
        const imageTagRegex = /\[GENERATE_IMAGE:\s*(.*?)\]/;
        const imgMatch = text.match(imageTagRegex);

        // 3. Check for Video Generation Tag
        const videoTagRegex = /\[GENERATE_VIDEO:\s*(.*?)\]/;
        const vidMatch = text.match(videoTagRegex);

        if (vidMatch) {
           // --- VEO VIDEO GENERATION ---
           const videoPrompt = vidMatch[1];
           text = text.replace(videoTagRegex, '').trim();
           
           try {
               // "Veo 3 video generation ... using the model veo-3.1-fast-generate-preview"
               let operation = await ai.models.generateVideos({
                   model: 'veo-3.1-fast-generate-preview',
                   prompt: videoPrompt,
                   config: {
                       numberOfVideos: 1,
                       resolution: '720p',
                       aspectRatio: '16:9' // Default to landscape
                   }
               });

               // Polling for completion
               while (!operation.done) {
                   await new Promise(resolve => setTimeout(resolve, 5000));
                   operation = await ai.operations.getVideosOperation({operation: operation});
               }

               const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
               if (downloadLink) {
                   // Fetch the video content with API Key
                   const videoRes = await fetch(`${downloadLink}&key=${API_KEY}`);
                   const videoBlob = await videoRes.blob();
                   
                   // Convert to Base64 Data URI for frontend playback
                   const reader = new FileReader();
                   videoUrl = await new Promise((resolve) => {
                       reader.onloadend = () => resolve(reader.result as string);
                       reader.readAsDataURL(videoBlob);
                   });
               }
           } catch (vidError) {
               console.error("Video generation failed:", vidError);
               text += "\n[SYSTEM ERROR: Video generation protocol failed.]";
           }

        } else if (imgMatch) {
           // --- IMAGEN GENERATION ---
           const imagePrompt = imgMatch[1];
           text = text.replace(imageTagRegex, '').trim();

           try {
            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [{ text: `A high-tech, futuristic neon blue schematic diagram: ${imagePrompt}. Cyberpunk aesthetic, white and cyan lines on black.` }]
                }
            });

            if (imageResponse.candidates?.[0]?.content?.parts) {
                for (const part of imageResponse.candidates[0].content.parts) {
                    if (part.inlineData) {
                        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
                        break;
                    }
                }
            }
          } catch (imgError) {
            console.error("Image generation failed:", imgError);
          }
        }
    }

    // 4. Generate Speech (TTS)
    if (isVoiceMode && text) {
        try {
            const speechResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-preview-tts',
                contents: { parts: [{ text: text }] },
                config: {
                    responseModalities: [Modality.AUDIO],
                    speechConfig: {
                        voiceConfig: {
                            prebuiltVoiceConfig: { voiceName: 'Aoife' }
                        }
                    }
                }
            });

            audioData = speechResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        } catch (ttsError) {
            console.error("TTS generation failed:", ttsError);
        }
    }

    return { text, imageUrl, videoUrl, audioData, webSources };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
