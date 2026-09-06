import { z } from "zod";
export const credentials = z.object({
  email: z.string().trim().email().max(128), password: z.string().min(6).max(128),
  name: z.string().trim().min(2).max(32).optional(),
}).strict();
export const registration = credentials.extend({ password: z.string().min(12).max(128) });
export const roomInput = z.object({
  name: z.string().trim().min(1).max(16),
  timerSec: z.union([z.literal(60), z.literal(120)]), bots: z.number().int().min(0).max(3),
}).strict();
const gameRecord = z.object({
  date: z.string().datetime(), won: z.boolean(),
  heroName: z.string().max(80).optional(), profession: z.string().max(80).optional(),
  quadrantStart: z.enum(["E", "S", "B", "I"]).optional(), quadrantEnd: z.enum(["E", "S", "B", "I"]).optional(),
  difficulty: z.enum(["easy", "medium", "hard"]).optional(), mode: z.enum(["classic", "tez"]).optional(),
  escapeMonth: z.number().int().nonnegative().nullable().optional(), endMonth: z.number().int().nonnegative().optional(),
  winPath: z.enum(["dream", "cashflow"]).nullable().optional(),
  maxPassive: z.number().finite().optional(), minCredit: z.number().min(300).max(850).optional(),
  maxCredit: z.number().min(300).max(850).optional(), bankruptcies: z.number().int().nonnegative().optional(),
  maxKnowledge: z.number().int().nonnegative().optional(), bots: z.array(z.string().max(80)).max(3).optional(),
  beatenBots: z.array(z.string().max(80)).max(3).optional(), online: z.boolean().optional(),
  playersCount: z.number().int().min(1).max(4).optional(),
}).strict();
export const profileInput = z.object({profile: z.object({
  games: z.array(gameRecord).max(1000).optional(), lessons: z.array(z.string().max(80)).max(100).optional(),
}).strict()}).strict();
export const banInput = z.object({email: z.string().trim().email().max(128), banned: z.boolean()}).strict();
