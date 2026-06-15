import { describe, it, expect } from "vitest";
import {
  detectTrackSource,
  toMediaEmbed,
  toYouTubeEmbed,
  validateMusicUrl,
} from "@/lib/url-validator";

describe("detectTrackSource", () => {
  it("偵測 YouTube watch / shorts / youtu.be", () => {
    expect(detectTrackSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("youtube");
    expect(detectTrackSource("https://youtu.be/dQw4w9WgXcQ")).toBe("youtube");
    expect(detectTrackSource("https://www.youtube.com/shorts/aBcDeFgHiJk")).toBe("youtube");
  });
  it("偵測 YouTube Live", () => {
    expect(detectTrackSource("https://www.youtube.com/live/aBcDeFgHiJk")).toBe("youtube_live");
  });
  it("偵測 Suno", () => {
    expect(
      detectTrackSource("https://suno.com/song/12345678-1234-1234-1234-123456789abc"),
    ).toBe("suno");
    expect(detectTrackSource("https://www.suno.com/song/anything")).toBe("suno");
  });
  it("偵測 Udio", () => {
    expect(detectTrackSource("https://www.udio.com/songs/abcdef123456")).toBe("udio");
    expect(detectTrackSource("https://udio.com/songs/xYz-987")).toBe("udio");
  });
  it("偵測 SoundCloud", () => {
    expect(detectTrackSource("https://soundcloud.com/artist/track-name")).toBe("soundcloud");
  });
  it("不在白名單回 null", () => {
    expect(detectTrackSource("https://evil.example.com/song/1")).toBeNull();
    expect(detectTrackSource("javascript:alert(1)")).toBeNull();
    expect(detectTrackSource("http://www.youtube.com/watch?v=abc")).toBeNull();
    expect(detectTrackSource("")).toBeNull();
  });
});

describe("toMediaEmbed", () => {
  it("YouTube 產生官方 embed iframe", () => {
    const r = toMediaEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(r).toEqual({ kind: "youtube", src: "https://www.youtube.com/embed/dQw4w9WgXcQ" });
  });
  it("Suno 產生 embed/{uuid}", () => {
    const r = toMediaEmbed("https://suno.com/song/12345678-1234-1234-1234-123456789abc");
    expect(r?.kind).toBe("suno");
    if (r?.kind === "suno") {
      expect(r.src).toBe("https://suno.com/embed/12345678-1234-1234-1234-123456789abc");
      expect(r.trackUrl).toContain("suno.com/song/");
    }
  });
  it("Udio 產生 embed/songs/{id}", () => {
    const r = toMediaEmbed("https://www.udio.com/songs/abcdef123456");
    expect(r?.kind).toBe("udio");
    if (r?.kind === "udio") {
      expect(r.src).toBe("https://www.udio.com/embed/songs/abcdef123456");
    }
  });
  it("SoundCloud 使用 player widget", () => {
    const r = toMediaEmbed("https://soundcloud.com/artist/track-name");
    expect(r?.kind).toBe("soundcloud");
    if (r?.kind === "soundcloud") {
      expect(r.src).toContain("w.soundcloud.com/player");
      expect(r.src).toContain("artist%2Ftrack-name");
    }
  });
  it("非白名單回 null", () => {
    expect(toMediaEmbed("https://evil.example.com/x")).toBeNull();
  });
});

describe("validateMusicUrl 阻擋危險協定", () => {
  it("javascript: 拒絕", () => {
    expect(validateMusicUrl("javascript:alert(1)").ok).toBe(false);
  });
  it("data: 拒絕", () => {
    expect(validateMusicUrl("data:text/html,<script>1</script>").ok).toBe(false);
  });
  it("http 拒絕", () => {
    expect(validateMusicUrl("http://www.youtube.com/watch?v=abc").ok).toBe(false);
  });
});

describe("toYouTubeEmbed 與 detectTrackSource 一致", () => {
  it("/live/ 走 live、/watch 走 youtube,皆能 embed", () => {
    expect(detectTrackSource("https://www.youtube.com/live/aBcDeFgHiJk")).toBe("youtube_live");
    expect(toYouTubeEmbed("https://www.youtube.com/live/aBcDeFgHiJk")).toBe(
      "https://www.youtube.com/embed/aBcDeFgHiJk",
    );
  });
});
