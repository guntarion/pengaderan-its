// src/app/api/markdown/contoh-komparasi/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API route handler to fetch the markdown content
 *
 * This reads the markdown file from the filesystem and returns its content
 */
export async function GET() {
  try {
    // Get the path to the markdown file
    const filePath = path.join(process.cwd(), 'src/app/(DashboardLayout)/ide-inovasi/komparasi-ide/data/contoh-komparasi.md');

    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Return the content as JSON
    return NextResponse.json({
      content: fileContent,
      success: true,
    });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return NextResponse.json(
      {
        error: 'Failed to read markdown content',
        success: false,
      },
      { status: 500 }
    );
  }
}
