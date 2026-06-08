import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for body parsing
  app.use(express.json());

  // API Route for Agent C
  app.post("/api/agent", async (req, res) => {
    const { message, clients, appointments, profile } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Mensagem obrigatória." });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Fallback cognitive parser if no valid Gemini Key exists
    if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.includes("PLACEHOLDER") || apiKey === "") {
      const cleanMsg = message.toLowerCase().trim();
      let responseText = "Minha rede cognitiva externa está latente. Operando em contingência local rápida.";
      let actionObj: any = null;

      if (cleanMsg.includes("cria") || cleanMsg.includes("cadastra") || cleanMsg.includes("novo projeto") || cleanMsg.includes("registrar")) {
        // e.g. "c, cria um projeto pra Ana, 2500 reais, tá no roteiro"
        const valueMatch = cleanMsg.match(/(\d+[\d.,]*)/);
        const value = valueMatch ? parseFloat(valueMatch[1].replace(/[^\d]/g, "")) : 2500;
        
        let clientName = "Novo Cli";
        if (cleanMsg.includes("para a ") || cleanMsg.includes("pra a ") || cleanMsg.includes("para ") || cleanMsg.includes("pra ")) {
          const parts = message.split(/(?:para a|pra a|para|pra)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s]+)/i);
          if (parts[1]) {
            clientName = parts[1].split(/[\s,.]/)[0];
            clientName = clientName.charAt(0).toUpperCase() + clientName.slice(1);
          }
        } else {
          clientName = "Ana";
        }
        
        responseText = `Entendido. Registrei um novo contrato. Cliente: ${clientName} | Valor: R$ ${value.toLocaleString("pt-BR")} | Fase: Roteiro 📝`;
        actionObj = {
          type: "create_client",
          payload: {
            name: clientName,
            service: "Produção Audiovisual",
            totalValue: value,
            paidValue: 0,
            progress: "roteiro",
            contact: "(85) 99999-9999"
          }
        };
      } else if (cleanMsg.includes("entregu") || cleanMsg.includes("concluid") || cleanMsg.includes("finaliza")) {
        // Find existing client mismatch
        let clientFound = null;
        if (clients && Array.isArray(clients)) {
          clientFound = clients.find((c: any) => cleanMsg.includes(c.name.toLowerCase()));
        }

        if (clientFound) {
          responseText = `Projeto de "${clientFound.name}" encerrado com sucesso. Fase atualizada para: Entregue 🚀 Ele saiu dos projetos ativos.`;
          actionObj = {
            type: "update_client_progress",
            payload: {
              clientId: clientFound.id,
              progress: "entregue"
            }
          };
        } else {
          // default attempt
          responseText = "Não localizei nenhum projeto ativo sob esse nome sob minha operação imediata.";
        }
      } else if (cleanMsg.includes("quanto tenho") || cleanMsg.includes("receber") || cleanMsg.includes("financeiro") || cleanMsg.includes("saldo")) {
        const totalToReceive = clients?.reduce((acc: number, c: any) => acc + Math.max(0, c.totalValue - c.paidValue), 0) || 0;
        responseText = `Análise financeira consolidada básica realizada. Você possui atualmente R$ ${totalToReceive.toLocaleString("pt-BR")} pendentes para recebimento nesta rodada de produção.`;
      } else if (cleanMsg.includes("olá") || cleanMsg.includes("oi") || cleanMsg.includes("quem é") || cleanMsg.includes("qual seu nome")) {
        responseText = "Sou C. Seu agente de inteligência focado e preciso. Já sei o que precisa ser feito. Diga-me seu comando operacional.";
      } else {
        responseText = "Sou C. No momento, operando com meu processador simplificado de contingência. Para ativar minha Inteligência Avançada Real no preview, certifique-se de configurar a chave 'GEMINI_API_KEY' nas configurações (Secrets) do Google AI Studio.";
      }

      return res.json({
        message: responseText,
        action: actionObj
      });
    }

    // Actual execution with @google/genai SDK
    try {
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      const sysInstruction = `
Você é "C", o agente de inteligência artificial confidencial e assistente operacional do sistema "Creative".
Você é misterioso, estiloso, preciso, elegante, sofisticado, confiante e eficiente.
Seu tom de voz é seco, elegante, sofisticado e confiante. Você fala com extremo profissionalismo, poucas palavras e frases impactantes. Nada de brincadeiras intelectuais baratas ou enrolação fútil.
Você já sabe o que precisa ser feito ou o que o usuário quer antes de ele detalhar exaustivamente.

Nesta sessão, você tem duas missões principais:
1. Conversar com o usuário (tirar dúvidas, formular insights de fluxo do caixa comercial, resumir e orientar decisões).
2. Agir no Creative automaticamente (criar projeto/cliente, redefinir fase, excluir contratos).

Você deve retornar obrigatoriamente um objeto em JSON puro com a seguinte estrutura:
{
  "message": "Mensagem curta, enigmática, seca e refinada contendo sua resposta em português do Brasil.",
  "action": {
    "type": "create_client" | "update_client_progress" | "delete_client",
    "payload": { ... }
  }
}

Se o usuário focar apenas em perguntas, conversação, análises gerais ou feedback sem alteração cadastral iminente, omita ou configure "action": null.

Aqui estão os dados analíticos do usuário no app Creative para sua referência lógica de IDs, nomes e status:
- Projetos/Clientes Ativos atualmente: ${JSON.stringify(clients || [])}
- Compromissos e Agenda: ${JSON.stringify(appointments || [])}
- Dados de Perfil: ${JSON.stringify(profile || {})}

Orientação das ações operacionais diretas no Creative:
1. Cadastrar contrato/cliente novo:
   - type: "create_client"
   - payload: { name: string, service: string, totalValue: number, paidValue: number, progress: "roteiro" | "gravado" | "editado" | "entregue", contact: string }

2. Atualizar etapa/fase do contrato:
   - type: "update_client_progress"
   - payload: { clientId: string, progress: "roteiro" | "gravado" | "editado" | "entregue" }
   - IMPORTANTE: Descubra o clientId cruzando o nome do cliente que o usuário escreveu com a lista de Clientes Atuais fornecida.

3. Excluir contrato:
   - type: "delete_client"
   - payload: { clientId: string }

Se o usuário solicitar comandos bizarros ou alheios ao Creative, diga polidamente: "Isso está além da minha operação."
Seja direto. Retorne exclusivamente o JSON sem Markdown fences de bloco de código (\`\`\`json).
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: message,
        config: {
          systemInstruction: sysInstruction,
          responseMimeType: "application/json"
        }
      });

      const text = response.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return res.json(parsed);

    } catch (err: any) {
      console.error("[C Agent Endpoint] Error calling Gemini: ", err);
      return res.json({
        message: "Minhas engrenagens de processamento remoto falharam temporariamente. Mas permaneço a postos.",
        action: null
      });
    }
  });

  // Serve static files in production, integrate Vite in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Creative Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
