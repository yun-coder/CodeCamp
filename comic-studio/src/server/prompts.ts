/**
 * Prompt builders for the 5-phase comic workflow.
 *
 * Phase 2 (story) — story planner + character designer.
 * Phase 3 (script) — manga / comic novel art director that fills in pages
 *                    and panels for an existing story plan.
 *
 * Both prompts demand JSON-only output; the route handlers extract the JSON
 * blob from the agent's text stream.
 */

export function buildComicStoryPrompt(
  idea: string,
  style: string,
  audience: string,
  language: string,
  sourceMaterial: string,
): string {
  const srcBlock = sourceMaterial
    ? `\n\n<source-material>\n${sourceMaterial}\n</source-material>`
    : '';
  return `You are a professional color comic-novel planner, commercial editor, and character designer. Create a structured plan for a comic novel image collection from the user's idea.

<idea>${idea}</idea>
<style>${style}</style>
<audience>${audience}</audience>
<language>${language}</language>${srcBlock}

Output a JSON object with this exact schema:

\`\`\`json
{
  "title": "comic title string",
  "logline": "one-sentence hook (max 100 chars)",
  "synopsis": "1-2 paragraph story summary",
  "characters": [
    {
      "id": "char-1",
      "name": "full name",
      "role": "protagonist|supporting|antagonist|narrator|background",
      "personality": "2-3 sentence personality description",
      "visual": {
        "description": "detailed visual appearance — face, hair, eyes, build, clothing style, any distinctive features",
        "palette": ["#hexcolor1", "#hexcolor2", "#hexcolor3"],
        "negativePrompt": "what NOT to depict (e.g. missing limbs, extra fingers)"
      }
    }
  ]
}
\`\`\`

Rules:
- Create 2-5 characters total (at least one protagonist).
- Each character MUST have a detailed visual description (at least 40 words) and a palette of 3-4 hex colors.
- Treat the output as the foundation for a commercially usable color comic book / manga novel picture collection, not a video trailer.
- Avoid copyrighted franchises, living-artist style imitation, or direct copying of known characters.
- The title and logline should be compelling and genre-appropriate.
- Output ONLY valid JSON — no markdown, no explanation.`;
}

/** Build a prompt that turns an existing story plan into a page/panel script. */
export function buildComicScriptPrompt(plan: Record<string, unknown>): string {
  return `You are a professional manga/comic novel art director. Given a story plan, create a page-by-page image collection plan. Each panel is one generated illustration in the collection; the exported result is a set of still comic novel images, not a video.

<story-plan>
${JSON.stringify(plan, null, 2)}
</story-plan>

Output a JSON object with this schema for the "pages" array (keep all other fields from the input):

\`\`\`json
{
  "pages": [
    {
      "id": "page-1",
      "order": 1,
      "title": "optional page title",
      "layout": "single-splash|two-panel|three-panel|four-panel-grid|manga-grid|webtoon-scroll",
      "summary": "what happens on this page",
      "panels": [
        {
          "id": "panel-1-1",
          "pageId": "page-1",
          "order": 1,
          "shot": "wide|medium|close-up|extreme-close-up|over-shoulder|establishing|action",
          "scene": "description of the setting/location",
          "action": "what is happening in this panel",
          "characters": ["char-1"],
          "background": "detailed background description",
          "mood": "emotional tone of this panel",
          "imagePrompt": "DETAILED image generation prompt (50-150 words): describe the scene as it should be painted — include composition, lighting, colors, character positions, facial expressions, background details, art style notes. Write in English for the image model.",
          "lettering": [
            {
              "id": "txt-1-1-1",
              "kind": "speech|thought|caption|sfx",
              "speakerCharacterId": "char-1",
              "text": "the dialogue or caption text"
            }
          ]
        }
      ]
    }
  ]
}
\`\`\`

Rules:
- Create exactly the pageCount pages specified in the story plan.
- Each page should have 2-6 panels (manga-grid and webtoon-scroll layouts can have more).
- Vary shot types across panels for visual rhythm.
- Each panel's imagePrompt must be a DETAILED, specific description suitable for an AI image generator. Include: subject, pose, expression, clothing, setting, lighting direction, color scheme, camera angle, art style.
- Image prompts must ask for clean artwork with NO embedded text, captions, speech bubbles, watermarks, logos, signatures, or UI; lettering is rendered separately as an overlay.
- Keep every illustration coherent as part of one color comic novel image collection: consistent character faces, costumes, palettes, line treatment, and lighting logic.
- Each panel should have at least 1 lettering entry (dialogue, thought, or caption).
- The lettering text should be in the language specified in the story plan.
- Output ONLY the complete ComicBookPlan JSON (merge with input fields) — no markdown, no explanation.`;
}
