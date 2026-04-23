// src/app/api/markdown/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API route handler to fetch markdown content by ID from query parameter
 * This handles requests to /api/markdown?id=...
 */
export async function GET(request: NextRequest) {
  try {
    // Get the ID from query parameter
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      console.error('No ID provided in request');
      return NextResponse.json({ error: 'ID is required', success: false }, { status: 400 });
    }

    // Validate the ID to prevent directory traversal attacks
    if (!id.match(/^[a-zA-Z0-9-]+$/)) {
      console.error(`Invalid ID format: ${id}`);
      return NextResponse.json({ error: 'Invalid ID format', success: false }, { status: 400 });
    }

    // Get the path to the markdown file
    const filePath = path.join(process.cwd(), `src/app/(DashboardLayout)/kelola-inovasi/konsep-kelola/case-studies/${id}.md`);
    console.log(`Looking for file at: ${filePath}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);

      // Check if the directory exists
      const dirPath = path.join(process.cwd(), 'src/app/(DashboardLayout)/kelola-inovasi/konsep-kelola/case-studies');
      const directoryExists = fs.existsSync(dirPath);
      console.log(`Directory exists: ${directoryExists}`);

      // If directory exists, list files to help debug
      if (directoryExists) {
        try {
          const files = fs.readdirSync(dirPath);
          console.log(`Files in directory: ${files.join(', ')}`);
        } catch (e) {
          console.error(`Error reading directory: ${e}`);
        }
      }

      return NextResponse.json(
        {
          error: 'Case study not found',
          path: filePath,
          success: false,
        },
        { status: 404 }
      );
    }

    // Read the file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    console.log(`Successfully read file with length: ${fileContent.length} characters`);

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
        details: error instanceof Error ? error.message : String(error),
        success: false,
      },
      { status: 500 }
    );
  }
}
