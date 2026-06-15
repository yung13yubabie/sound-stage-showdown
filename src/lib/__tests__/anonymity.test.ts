import { describe, it, expect } from "vitest";
import {
  maskAnonymousEntry,
  maskAnonymousEntries,
  shouldRevealIdentity,
  assertNoLeak,
  type RoundEntryLike,
} from "@/lib/anonymity";

const baseEntry: RoundEntryLike = {
  id: "entry-1",
  anonymous_code: "AXYZ-001",
  creator_id: "00000000-0000-0000-0000-000000000001",
  creator_username: "alice",
  creator_display_name: "Alice",
  creator_avatar_url: "https://cdn.example.com/a.png",
};

describe("shouldRevealIdentity", () => {
  it("匿名階段對一般訪客 → false", () => {
    expect(shouldRevealIdentity("voting_anonymous", "anonymous_until_reveal")).toBe(false);
    expect(shouldRevealIdentity("submission_open", "anonymous_until_reveal")).toBe(false);
  });
  it("揭露後階段 → true", () => {
    for (const p of [
      "identity_reveal",
      "voting_public",
      "tallying",
      "round_results_published",
      "completed",
    ]) {
      expect(shouldRevealIdentity(p, "anonymous_until_reveal")).toBe(true);
    }
  });
  it("全程公開模式 → true", () => {
    expect(shouldRevealIdentity("voting_anonymous", "public_all_the_time")).toBe(true);
  });
  it("主辦人/作者本人總是看得到", () => {
    expect(shouldRevealIdentity("voting_anonymous", "anonymous_until_reveal", true)).toBe(true);
  });
});

describe("maskAnonymousEntry — 匿名階段不洩漏", () => {
  it("匿名投票期間,訪客拿不到 creator_*", () => {
    const masked = maskAnonymousEntry(baseEntry, {
      phase: "voting_anonymous",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: "viewer-99",
      hostUserId: "host-77",
    });
    expect(masked.creator_id).toBeNull();
    expect(masked.creator_username).toBeNull();
    expect(masked.creator_display_name).toBeNull();
    expect(masked.creator_avatar_url).toBeNull();
    // 匿名碼仍保留,給訪客 UI 顯示
    expect(masked.anonymous_code).toBe("AXYZ-001");
  });

  it("登入訪客(非主辦/非作者)依舊匿名", () => {
    const masked = maskAnonymousEntry(baseEntry, {
      phase: "submission_open",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: "some-other-user",
      hostUserId: "host-77",
    });
    expect(masked.creator_username).toBeNull();
  });

  it("揭露後,creator_* 還給訪客", () => {
    const revealed = maskAnonymousEntry(baseEntry, {
      phase: "identity_reveal",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: null,
      hostUserId: "host-77",
    });
    expect(revealed.creator_username).toBe("alice");
    expect(revealed.creator_display_name).toBe("Alice");
  });

  it("主辦人在匿名階段也看得到", () => {
    const host = maskAnonymousEntry(baseEntry, {
      phase: "voting_anonymous",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: "host-77",
      hostUserId: "host-77",
    });
    expect(host.creator_username).toBe("alice");
  });

  it("作者本人總是看得到自己的稿", () => {
    const self = maskAnonymousEntry(baseEntry, {
      phase: "voting_anonymous",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: baseEntry.creator_id ?? null,
      hostUserId: "host-77",
    });
    expect(self.creator_username).toBe("alice");
  });
});

describe("maskAnonymousEntries + assertNoLeak — 端到端守門", () => {
  const entries: RoundEntryLike[] = [
    baseEntry,
    {
      id: "entry-2",
      anonymous_code: "BXYZ-002",
      creator_id: "00000000-0000-0000-0000-000000000002",
      creator_username: "bob",
      creator_display_name: "Bob",
      creator_avatar_url: null,
    },
  ];

  it("匿名階段批次 mask 後通過 assertNoLeak", () => {
    const out = maskAnonymousEntries(entries, {
      phase: "voting_anonymous",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: "viewer-99",
      hostUserId: "host-77",
    });
    expect(() => assertNoLeak(out)).not.toThrow();
  });

  it("如果 RPC 不小心回了名字,assertNoLeak 會炸開", () => {
    // 模擬「server 端 mask 失敗」的情況
    expect(() => assertNoLeak(entries)).toThrow(/匿名守門失敗/);
  });

  it("揭露後 assertNoLeak 不該被呼叫(會失敗,符合預期)", () => {
    const revealed = maskAnonymousEntries(entries, {
      phase: "round_results_published",
      authorVisibility: "anonymous_until_reveal",
      viewerUserId: null,
      hostUserId: "host-77",
    });
    expect(revealed[0].creator_username).toBe("alice");
    expect(() => assertNoLeak(revealed)).toThrow();
  });
});
