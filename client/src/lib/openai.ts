import { Settings } from "@/types";

/**
 * Client-side interface to the server-side OpenAI API
 */

/**
 * Process an image to extract multiple-choice answers
 * @param pageId ID of the page to process
 * @returns The server response with extracted answers
 */
export async function processPageImage(pageId: number) {
  const response = await fetch(`/api/pages/${pageId}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to process image: ${errorText || response.statusText}`);
  }
  
  return response.json();
}

/**
 * Get the current OpenAI settings
 * @returns The current settings
 */
export async function getOpenAISettings(): Promise<Settings> {
  const response = await fetch('/api/settings', {
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to get settings');
  }
  
  return response.json();
}

/**
 * Update OpenAI settings
 * @param settings Settings to update
 * @returns The updated settings
 */
export async function updateOpenAISettings(settings: Partial<Settings>): Promise<Settings> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(settings),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error('Failed to update settings');
  }
  
  return response.json();
}
