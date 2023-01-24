import { parseEnv } from "znv";
import { z } from "zod";
import * as dotenv from 'dotenv';
dotenv.config();

export const {
  LLM_API_URL,
  REDIS_URL,
  /** Matrix Bot Settings */
  HOMESERVER_URL,
  ACCESS_TOKEN,
  LOGINNAME,
  PASSWORD,
  /** Matrix Access Control */
  BLACKLIST,
  WHITELIST,
  /** Bot Feature Flags */
  AUTOJOIN,
  ENCRYPTION,
  REQUIRE_MENTION,
  REQUIRE_MENTION_DM,
} = parseEnv(process.env, {
  /** Matrix Bot Settings */
  LLM_API_URL:          { schema: z.string().url().default("http://localhost:3000/conversation"),
    description: "Set LLM APIs location with 'http(s)://' prefix"},
  REDIS_URL:            { schema: z.string().default(""),
    description: "Set to redis instance if you want to use redis instead of the file system for state"},
  HOMESERVER_URL:       { schema: z.string().url().default("https://matrix.org"),
    description: "Set matrix homeserver with 'https://' prefix"},
  ACCESS_TOKEN:         { schema: z.string().default(""),
    description: "Set LOGINNAME & PASSWORD or ACCESS_TOKEN (which supercedes the former)"},
  LOGINNAME:            { schema: z.string().optional(),
    description: "Set LOGINNAME & PASSWORD or ACCESS_TOKEN (which supercedes the former)"},
  PASSWORD:             { schema: z.string().optional(),
    description: "Set LOGINNAME & PASSWORD or ACCESS_TOKEN (which supercedes the former)"},
  /** Matrix Access Control */
  BLACKLIST:            { schema: z.string().optional(),
    description: "Set to a space separated string of 'user:homeserver' or a wildcard like ':homeserver.example2' to blacklist users or domains"},
  WHITELIST:            { schema: z.string().optional(),
    description: "Set to a space separated string of 'user:homeserver' or a wildcard like ':homeserver.example2' to whitelist users or domains"},
  /** Bot Feature Flags */
  AUTOJOIN:             { schema: z.boolean().default(true),
    description: "Set to true if you want the bot to autojoin when invited"},
  ENCRYPTION:           { schema: z.boolean().default(true),
    description: "Set to true if you want the bot to support encrypted channels"},
  REQUIRE_MENTION:      { schema: z.boolean().default(false),
    description: "Set to false if you want the bot to answer to all messages in a thread/conversation"},
  REQUIRE_MENTION_DM:   { schema: z.boolean().default(false),
    description: "Set to false if you want the bot to answer to all messages in a one-to-one room"},
});
