import { GoogleGenAI, Type } from "@google/genai";
import { CommentData } from "../types";

// ✅ Fonction améliorée avec meilleur diagnostic
const getClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  // Debug pour Vercel
  console.log('🔍 Vérification de la clé API...');
  console.log('Environment MODE:', import.meta.env.MODE);
  console.log('Clé API présente:', !!apiKey);
  console.log('Longueur de la clé:', apiKey?.length || 0);
  
  if (!apiKey) {
    console.error('❌ VITE_GEMINI_API_KEY manquante !');
    console.error('Variables disponibles:', Object.keys(import.meta.env));
    
    throw new Error(
      'Clé API Gemini non configurée.\n\n' +
      'Vérifiez que VITE_GEMINI_API_KEY est bien définie dans Vercel:\n' +
      '1. Settings → Environment Variables\n' +
      '2. Redéployez sans cache (décochez "Use existing build cache")'
    );
  }
  
  console.log('✅ Clé API chargée avec succès');
  return new GoogleGenAI({ apiKey });
};

const EXTRACT_PROMPT = `Extract all user comments from this screenshot.
Return the comments as a JSON array of strings.
Rules:
1. Include only the actual comment text.
2. Skip usernames, timestamps, or UI elements.
3. Preserve original French text exactly.
4. Skip empty comments.`;

const ANALYZE_SYSTEM_INSTRUCTION = `Tu es un expert en analyse de sentiment client.
Ton objectif est de classer chaque commentaire de manière NUANCÉE et OBJECTIVE.

DÉFINITIONS :
1. POSITIVE :
   - Satisfaction, compliments, remerciements.
   - "C'est top", "Merci", "Bravo".
   - Les avis globalement positifs même avec un détail mineur.

2. NEGATIVE :
   - Problèmes techniques, bugs, lenteurs.
   - Insatisfaction, déception, colère.
   - Ironie ou sarcasme clair.
   - Les avis "mitigés" où le négatif l'emporte clairement.

3. NEUTRAL :
   - Questions.
   - Faits, constats sans jugement de valeur.
   - Commentaires ambigus.

Règle d'or : Si un commentaire est "Mitigé", demande-toi : est-ce que l'utilisateur est globalement content (Positive) ou mécontent (Negative) ?`;

const ANALYZE_PROMPT_TEMPLATE = `Analyse le commentaire client suivant.

EXEMPLES DE RÉFÉRENCE :
- "Super appli, j'adore !" -> POSITIVE
- "L'interface est belle mais ça rame trop, c'est chiant." -> NEGATIVE
- "Franchement déçu par la mise à jour." -> NEGATIVE
- "Super appli, manque juste le mode sombre." -> POSITIVE
- "Comment on change la langue ?" -> NEUTRAL
- "Service client réactif, merci." -> POSITIVE

COMMENTAIRE À ANALYSER :
"""{{COMMENT}}"""

1. Écris une courte phrase de "reasoning" (raisonnement).
2. Déduis-en le sentiment (positive, negative, neutral).
3. Identifie le topic et le theme.

Retourne le résultat au format JSON.`;

const cleanJson = (text: string | undefined): string => {
  if (!text) return "";
  let clean = text.trim();
  
  // 1. Try to extract from Markdown code blocks first
  const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    clean = match[1].trim();
  }

  // 2. Locate the first '{' or '[' and the last '}' or ']'
  const firstOpenBrace = clean.indexOf('{');
  const firstOpenBracket = clean.indexOf('[');
  let startIndex = -1;
  let endIndex = -1;

  if (firstOpenBrace !== -1 && (firstOpenBracket === -1 || firstOpenBrace < firstOpenBracket)) {
    startIndex = firstOpenBrace;
    endIndex = clean.lastIndexOf('}') + 1;
  } 
  else if (firstOpenBracket !== -1) {
    startIndex = firstOpenBracket;
    endIndex = clean.lastIndexOf(']') + 1;
  }

  if (startIndex !== -1 && endIndex !== -1) {
    clean = clean.substring(startIndex, endIndex);
  }

  return clean;
};

const fileToGenerativePart = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64String = result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const processImage = async (
  file: File, 
  onProgress: (msg: string) => void
): Promise<CommentData[]> => {
  // ✅ CORRECTION CRITIQUE : Tout dans le try-catch
  try {
    // Initialiser le client ICI, dans le try-catch
    const ai = getClient();
    const base64Data = await fileToGenerativePart(file);

    onProgress(`Extraction du texte de ${file.name}...`);

    // 1. Extract Comments
    const extractResponse = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: {
        parts: [
          { text: EXTRACT_PROMPT },
          { inlineData: { mimeType: file.type, data: base64Data } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        maxOutputTokens: 8192,
      }
    });

    const rawComments = cleanJson(extractResponse.text);
    let comments: string[] = [];
    
    try {
        comments = JSON.parse(rawComments || "[]");
    } catch (e) {
        console.warn("JSON parse failed for extraction:", e);
        return [];
    }
    
    if (!comments || comments.length === 0) return [];

    const results: CommentData[] = [];

    // 2. Analyze each comment
    const batchSize = 5; 
    for (let i = 0; i < comments.length; i += batchSize) {
      const batch = comments.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (comment) => {
        try {
            const safeComment = comment.length > 5000 ? comment.substring(0, 5000) + "[...]" : comment;
            const fullPrompt = ANALYZE_PROMPT_TEMPLATE.replace('{{COMMENT}}', safeComment);

            const analysisResponse = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: {
                  parts: [{ text: fullPrompt }]
                },
                config: {
                    systemInstruction: ANALYZE_SYSTEM_INSTRUCTION,
                    responseMimeType: "application/json",
                    temperature: 0.1, 
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            reasoning: { type: Type.STRING },
                            sentiment: { type: Type.STRING, enum: ["positive", "negative", "neutral"] },
                            confidence: { type: Type.NUMBER },
                            topic: { type: Type.STRING },
                            theme: { type: Type.STRING }
                        },
                        required: ["reasoning", "sentiment", "topic", "theme"]
                    },
                    maxOutputTokens: 8192,
                }
            });
            
            const rawAnalysis = cleanJson(analysisResponse.text);
            
            let analysis;
            try {
              analysis = JSON.parse(rawAnalysis || "{}");
            } catch(e) {
              console.error("JSON Parsing Error on Analysis:", e);
              return null;
            }
            
            let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
            if (analysis.sentiment) {
                const s = analysis.sentiment.toLowerCase().trim();
                if (s.includes('positi')) sentiment = 'positive';
                else if (s.includes('negati') || s.includes('négati')) sentiment = 'negative';
                else sentiment = 'neutral';
            }

            return {
                id: crypto.randomUUID(),
                imageSource: file.name,
                text: comment,
                sentiment: sentiment,
                confidence: analysis.confidence || 0.9,
                topic: analysis.topic || 'Autre',
                theme: analysis.theme || 'Autre'
            } as CommentData;
        } catch (e) {
            console.error("Failed to analyze comment:", e);
            return {
                id: crypto.randomUUID(),
                imageSource: file.name,
                text: comment,
                sentiment: 'neutral',
                confidence: 0,
                topic: 'Erreur',
                theme: 'Non analysé'
            } as CommentData;
        }
      });

      onProgress(`Analyse des commentaires ${i + 1}-${Math.min(i + batchSize, comments.length)} sur ${comments.length} pour ${file.name}...`);
      const batchResults = await Promise.all(batchPromises);
      results.push(...(batchResults.filter(r => r !== null) as CommentData[]));
    }

    return results;

  } catch (error) {
    console.error("❌ Error processing image:", error);
    
    // Meilleur message d'erreur pour l'utilisateur
    if (error instanceof Error) {
      throw new Error(`Erreur lors du traitement: ${error.message}`);
    }
    
    throw error;
  }
};
