// pages/api/debug-env.ts
export default function handler(req, res) {
  res.status(200).json({ key: process.env.OPENROUTER_API_KEY });
}
