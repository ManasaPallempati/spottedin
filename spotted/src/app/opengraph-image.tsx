import { ImageResponse } from "next/og";

export const alt = "SPOTTED — prices fall every hour. catch them first.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          color: "#EDEBE4",
          backgroundColor: "#0A0A0C",
          fontFamily: "Arial Black, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 72, letterSpacing: 2 }}>
          SPOTTED
          <span
            style={{
              display: "flex",
              width: 26,
              height: 26,
              marginLeft: 10,
              borderRadius: 999,
              backgroundColor: "#D9FF3D",
            }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ color: "#D9FF3D", fontSize: 24, letterSpacing: 5 }}>
            GLOBAL DROP — EVERY HOUR
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              maxWidth: 900,
              fontSize: 58,
              lineHeight: 1.05,
            }}
          >
            <span>prices fall every hour.</span>
            <span>catch them first.</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
