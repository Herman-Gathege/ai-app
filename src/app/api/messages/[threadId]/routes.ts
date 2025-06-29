import { db } from "@/src/db"; // adjust if your DB instance is elsewhere
import { messagesTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { Message } from "ai"; // Adjust import based on your Message type definition

export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const { threadId } = params;

  try {
    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.appId, threadId));

    // Format messages for useChat()
    const formattedMessages = messages.map((m) => m.message);

    return NextResponse.json(formattedMessages);
  } catch (err) {
    console.error("❌ Failed to load messages:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } }
) {
  const { threadId } = params;
  const body = await req.json();

  const messages: Message[] = body.messages;

  if (!Array.isArray(messages)) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  try {
    await db.insert(messagesTable).values(
      messages.map((msg) => ({
        id: msg.id,
        appId: threadId,
        message: msg,
      }))
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Failed to save messages:", err);
    return new NextResponse("Failed to save messages", { status: 500 });
  }
}
