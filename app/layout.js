import "./globals.css";

export const metadata = {
  title: "Hireability. | Resume clarity, measured",
  description: "Get a fast, honest read on the resume signals recruiters look for first.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
