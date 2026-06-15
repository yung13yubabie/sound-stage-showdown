/**
 * 客端匿名守門:防禦深度。即使 SECURITY DEFINER RPC 不小心回了創作者欄位,
 * 此 helper 仍把匿名階段的識別資訊強制清空。
 */

export type AnonymousPhase =
  | "submission_open"
  | "voting_anonymous"
  | "identity_reveal"
  | "voting_public"
  | "tallying"
  | "round_results_published"
  | "completed"
  | "draft";

export const REVEALED_PHASES: ReadonlySet<AnonymousPhase> = new Set<AnonymousPhase>([
  "identity_reveal",
  "voting_public",
  "tallying",
  "round_results_published",
  "completed",
]);

export interface RoundEntryLike {
  id: string;
  anonymous_code?: string | null;
  creator_id?: string | null;
  creator_username?: string | null;
  creator_display_name?: string | null;
  creator_avatar_url?: string | null;
  [k: string]: unknown;
}

export function shouldRevealIdentity(
  phase: string,
  authorVisibility: "anonymous_until_reveal" | "public_all_the_time" | string,
  isHostOrSelf = false,
): boolean {
  if (isHostOrSelf) return true;
  if (authorVisibility === "public_all_the_time") return true;
  return REVEALED_PHASES.has(phase as AnonymousPhase);
}

export function maskAnonymousEntry<T extends RoundEntryLike>(
  entry: T,
  opts: {
    phase: string;
    authorVisibility: string;
    viewerUserId?: string | null;
    hostUserId?: string | null;
  },
): T {
  const isHost = !!opts.viewerUserId && opts.viewerUserId === opts.hostUserId;
  const isSelf = !!opts.viewerUserId && opts.viewerUserId === entry.creator_id;
  if (shouldRevealIdentity(opts.phase, opts.authorVisibility, isHost || isSelf)) {
    return entry;
  }
  return {
    ...entry,
    creator_id: null,
    creator_username: null,
    creator_display_name: null,
    creator_avatar_url: null,
  };
}

export function maskAnonymousEntries<T extends RoundEntryLike>(
  entries: T[],
  opts: Parameters<typeof maskAnonymousEntry>[1],
): T[] {
  return entries.map((e) => maskAnonymousEntry(e, opts));
}

export function assertNoLeak<T extends RoundEntryLike>(entries: T[]): void {
  for (const e of entries) {
    if (e.creator_id || e.creator_username || e.creator_display_name) {
      throw new Error(`匿名守門失敗:entry ${e.id} 仍包含創作者識別資訊`);
    }
  }
}
