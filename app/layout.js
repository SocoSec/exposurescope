export const metadata = {
  title: "ExposureScope — Personal Digital Exposure Self-Assessment",
  description:
    "A research prototype for assessing your own personal digital exposure: credential exposure, attribute inference, and remediation. Assess your own data only. Nothing is stored.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
