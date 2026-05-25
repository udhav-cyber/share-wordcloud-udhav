import { NextResponse } from "next/server";
import { get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type Category = "AI" | "Science" | "Business" | "Design" | "Other";

export type Submission = {
  id: string;
  username: string;
  word: string;
  category: Category;
  createdAt: string;
};

type StoreRead = {
  submissions: Submission[];
  storageConfigured: boolean;
};

const allowedUsers = [
  "Aarav",
  "Maya",
  "Noah",
  "Sophia",
  "Liam",
  "Emma",
  "Keshav",
  "Guest"
];

const categories: Category[] = ["AI", "Science", "Business", "Design", "Other"];
const blobPath = "word-cloud/submissions.json";
const localDataPath = path.join(process.cwd(), "data", "submissions.json");

export const dynamic = "force-dynamic";

const seedSubmissions: Submission[] = [
  { id: "seed-1", username: "Aarav", word: "Transformers", category: "AI", createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: "seed-2", username: "Maya", word: "Photosynthesis", category: "Science", createdAt: new Date(Date.now() - 6200000).toISOString() },
  { id: "seed-3", username: "Noah", word: "Branding", category: "Business", createdAt: new Date(Date.now() - 5400000).toISOString() },
  { id: "seed-4", username: "Sophia", word: "Typography", category: "Design", createdAt: new Date(Date.now() - 4200000).toISOString() },
  { id: "seed-5", username: "Liam", word: "Transformers", category: "AI", createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: "seed-6", username: "Emma", word: "Compounding", category: "Business", createdAt: new Date(Date.now() - 2600000).toISOString() },
  { id: "seed-7", username: "Keshav", word: "Entropy", category: "Science", createdAt: new Date(Date.now() - 1800000).toISOString() }
];

async function readSubmissions(): Promise<StoreRead> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await get(blobPath, { access: "private", useCache: false });

    if (!blob) {
      await writeSubmissions(seedSubmissions);
      return { submissions: seedSubmissions, storageConfigured: true };
    }

    const text = await new Response(blob.stream).text();

    return { submissions: JSON.parse(text) as Submission[], storageConfigured: true };
  }

  if (process.env.VERCEL) {
    return { submissions: seedSubmissions, storageConfigured: false };
  }

  try {
    const content = await readFile(localDataPath, "utf8");
    return { submissions: JSON.parse(content) as Submission[], storageConfigured: true };
  } catch {
    await writeSubmissions(seedSubmissions);
    return { submissions: seedSubmissions, storageConfigured: true };
  }
}

async function writeSubmissions(submissions: Submission[]) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await put(blobPath, JSON.stringify(submissions, null, 2), {
      access: "private",
      allowOverwrite: true,
      contentType: "application/json"
    });
    return;
  }

  await mkdir(path.dirname(localDataPath), { recursive: true });
  await writeFile(localDataPath, JSON.stringify(submissions, null, 2));
}

export async function GET() {
  const store = await readSubmissions();

  return NextResponse.json({
    allowedUsers,
    categories,
    submissions: store.submissions,
    storageConfigured: store.storageConfigured
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const word = String(body?.word ?? "").trim().replace(/\s+/g, " ");
  const category = String(body?.category ?? "Other") as Category;

  if (!allowedUsers.includes(username)) {
    return NextResponse.json({ error: "Pick a username from the list." }, { status: 400 });
  }

  if (!word || word.length > 40) {
    return NextResponse.json({ error: "Word must be 1-40 characters." }, { status: 400 });
  }

  if (!categories.includes(category)) {
    return NextResponse.json({ error: "Pick a valid group." }, { status: 400 });
  }

  const submission: Submission = {
    id: crypto.randomUUID(),
    username,
    word,
    category,
    createdAt: new Date().toISOString()
  };

  const store = await readSubmissions();
  if (!store.storageConfigured) {
    return NextResponse.json(
      { error: "Vercel Blob is not connected. Add a Blob store to enable submissions." },
      { status: 503 }
    );
  }

  const submissions = store.submissions;
  submissions.unshift(submission);
  await writeSubmissions(submissions);

  return NextResponse.json({ submission }, { status: 201 });
}
