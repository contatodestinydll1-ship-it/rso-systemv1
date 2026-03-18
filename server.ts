import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { Client, GatewayIntentBits, VoiceState, PermissionFlagsBits, SlashCommandBuilder, Routes, REST } from "discord.js";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import session, { SessionData } from "express-session";
import cookieParser from "cookie-parser";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = 3000;

// Configs
const GUILD_ID = process.env.DISCORD_GUILD_ID || "";
const ROLE_OFFICER = "1483678979947757719";
const ROLE_ADMIN = "1483680077353980035";

// Supabase Setup
const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

// Session Setup
app.set('trust proxy', 1); // Necessário para cookies seguros atrás de proxy (Cloud Run)
app.use(cookieParser());
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || "secret",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true, 
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000 
  }
}));

// Discord Bot Setup
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

client.on("error", (err) => console.error("Discord Client Error:", err));
client.on("warn", (warn) => console.warn("Discord Client Warning:", warn));

client.on("ready", async () => {
  console.log(`Bot RSO logado como ${client.user?.tag}!`);
  
  // Register Slash Commands
  const commands = [
    new SlashCommandBuilder()
      .setName('cadastrar_policial')
      .setDescription('Cadastra um novo policial no sistema')
      .addIntegerOption(opt => opt.setName('id').setDescription('ID do jogo').setRequired(true))
      .addStringOption(opt => opt.setName('nome').setDescription('Nome do policial').setRequired(true))
      .addUserOption(opt => opt.setName('membro').setDescription('Membro do Discord').setRequired(true)),
  ].map(command => command.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);
  try {
    if (!GUILD_ID) {
      console.warn("AVISO: DISCORD_GUILD_ID não configurado. Comandos não registrados.");
      return;
    }
    await rest.put(Routes.applicationGuildCommands(client.user!.id, GUILD_ID), { body: commands });
    console.log('Comandos registrados com sucesso.');
  } catch (error) {
    console.error("Erro ao registrar comandos:", error);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'cadastrar_policial') {
    const member = interaction.member as any;
    const hasAdminRole = member.roles.cache.has(ROLE_ADMIN);

    if (!hasAdminRole) {
      return interaction.reply({ content: "Você não tem permissão para usar este comando.", ephemeral: true });
    }

    const gameId = interaction.options.getInteger('id');
    const name = interaction.options.getString('nome');
    const discordUser = interaction.options.getUser('membro');

    try {
      const { error } = await supabase
        .from('officers')
        .upsert({ 
          game_id: gameId, 
          name: name, 
          discord_id: discordUser?.id,
          is_admin: false 
        });

      if (error) throw error;

      let replyMessage = `Policial **${gameId} | ${name}** cadastrado com sucesso!`;

      // Alterar o apelido no Discord
      if (interaction.guild && discordUser) {
        try {
          const member = await interaction.guild.members.fetch(discordUser.id);
          if (member) {
            await member.setNickname(`${gameId} | ${name}`);
          }
        } catch (nickError: any) {
          console.warn(`Não foi possível alterar o apelido de ${discordUser.tag}:`, nickError);
          if (nickError.code === 50013) {
            replyMessage += "\n⚠️ **Aviso:** Não consegui alterar o apelido no Discord (Permissão Insuficiente). Verifique se o meu cargo está acima do usuário e se tenho a permissão 'Gerenciar Apelidos'.";
          } else {
            replyMessage += "\n⚠️ **Aviso:** Ocorreu um erro ao tentar alterar o apelido no Discord.";
          }
        }
      }

      await interaction.reply(replyMessage);
    } catch (err) {
      console.error(err);
      await interaction.reply({ content: "Erro ao cadastrar policial no banco de dados.", ephemeral: true });
    }
  }
});

// --- Auth Routes ---
app.get("/api/auth/url", (req, res) => {
  // Detecta o host dinamicamente para garantir que a URL de redirecionamento seja exata
  const host = req.get('host');
  const protocol = 'https'; // Cloud Run sempre usa https
  const redirectUri = `${protocol}://${host}/auth-callback`;
  
  console.log(`[AUTH] Gerando URL. Host: ${host}, RedirectURI: ${redirectUri}`);
  
  const url = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=identify%20guilds.members.read&state=discord`;
  res.json({ url });
});

app.get("/auth-callback", async (req, res) => {
  const { code } = req.query;
  const host = req.get('host');
  const protocol = 'https';
  const redirectUri = `${protocol}://${host}/auth-callback`;

  try {
    console.log(`[AUTH] Callback recebido no host: ${host}`);
    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: redirectUri,
    }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const accessToken = tokenResponse.data.access_token;
    
    // Get user info
    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const discordUser = userResponse.data;

    // Check guild membership and roles
    const guild = await client.guilds.fetch(GUILD_ID);
    const member = await guild.members.fetch(discordUser.id).catch(() => null);

    if (!member) {
      return res.send(`
        <script>
          alert("Você não faz parte do servidor do Discord Itaim Paulista.");
          window.location.href = "/";
        </script>
      `);
    }

    const isOfficer = member.roles.cache.has(ROLE_OFFICER);
    const isAdmin = member.roles.cache.has(ROLE_ADMIN);

    if (!isOfficer && !isAdmin) {
      return res.send(`
        <script>
          alert("Você não possui o cargo necessário para acessar o sistema.");
          window.location.href = "/";
        </script>
      `);
    }

    // Get officer record from DB
    const { data: officerData } = await supabase
      .from('officers')
      .select('*')
      .eq('discord_id', discordUser.id)
      .single();

    (req as any).session.user = {
      id: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      isOfficer,
      isAdmin,
      gameId: officerData?.game_id,
      name: officerData?.name || discordUser.username
    };

    res.send(`
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          window.close();
        } else {
          window.location.href = "/dashboard";
        }
      </script>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Erro na autenticação.");
  }
});

app.get("/api/auth/me", (req, res) => {
  res.json((req as any).session.user || null);
});

app.post("/api/auth/logout", (req, res) => {
  (req as any).session.destroy(() => {
    res.json({ success: true });
  });
});

// --- RSO Routes ---
app.get("/api/officers/search", async (req, res) => {
  const { q } = req.query;
  const { data, error } = await supabase
    .from('officers')
    .select('*')
    .or(`name.ilike.%${q}%,game_id.eq.${parseInt(q as string) || 0}`);
  
  if (error) return res.status(500).json(error);
  res.json(data);
});

app.post("/api/rsos", async (req, res) => {
  const user = (req as any).session.user;
  if (!user) return res.status(401).json({ error: "Não autorizado" });

  const rsoData = req.body;
  
  // Check if user is in voice channel
  const guild = await client.guilds.fetch(GUILD_ID);
  const member = await guild.members.fetch(user.id);
  
  if (!member.voice.channelId) {
    try {
      await member.send("⚠️ Você iniciou um RSO, porém não está em nenhuma canaleta de voz! Seu RSO poderá ser cancelado se não entrar em uma call imediatamente.");
    } catch (e) {
      console.log("Could not send DM to user");
    }
  }

  const { data, error } = await supabase
    .from('rsos')
    .insert({
      created_by_id: user.gameId,
      vehicle_prefix: rsoData.vehicle_prefix,
      start_time: rsoData.start_time,
      partners: rsoData.partners,
      occurrence_details: rsoData.details,
      status: 'ativo'
    })
    .select()
    .single();

  if (error) return res.status(500).json(error);
  res.json(data);
});

app.get("/api/rsos", async (req, res) => {
  const { data, error } = await supabase
    .from('rsos')
    .select('*, officers!rsos_created_by_id_fkey(name)')
    .order('start_time', { ascending: false });
  
  if (error) return res.status(500).json(error);
  res.json(data);
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
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
    console.log(`Servidor RSO rodando em http://localhost:${PORT}`);
    
    const token = process.env.DISCORD_TOKEN;
    if (token) {
      console.log("Tentando logar no Discord...");
      client.login(token)
        .then(() => console.log("Login no Discord iniciado com sucesso."))
        .catch(err => {
          console.error("ERRO CRÍTICO: Falha no login do Discord!");
          console.error(err);
        });
    } else {
      console.warn("AVISO: DISCORD_TOKEN não encontrado nos Secrets!");
    }
  });
}

startServer();
