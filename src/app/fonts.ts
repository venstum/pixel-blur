import localFont from "next/font/local";

export const terminus = localFont({
  src: [
    {
      path: "../../assets/fonts/TerminusTTF-4.49.3.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../assets/fonts/TerminusTTF-Italic-4.49.3.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../../assets/fonts/TerminusTTF-Bold-4.49.3.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../assets/fonts/TerminusTTF-Bold-Italic-4.49.3.ttf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-terminus",
  display: "swap",
});

// Terminus is loaded locally to keep the UI consistent offline.
