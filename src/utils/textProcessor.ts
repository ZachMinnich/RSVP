// Normalize unicode quotes and special characters
export function normalizeText(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")      // Smart single quotes → apostrophe
    .replace(/[\u201C\u201D]/g, '"')       // Smart double quotes → straight
    .replace(/\u2013/g, '--')              // En dash
    .replace(/\u2014/g, ' -- ')            // Em dash
    .replace(/\u2026/g, '...')             // Ellipsis
    .replace(/\u00A0/g, ' ')              // Non-breaking space
    .replace(/\r\n/g, '\n')              // Windows line endings
    .replace(/\r/g, '\n');               // Old Mac line endings
}

// Remove Project Gutenberg header/footer boilerplate
export function removeGutenbergBoilerplate(text: string): string {
  const startMarkers = [
    /\*\*\* START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i,
    /\*\*\*START OF THE PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i,
    /START OF THE PROJECT GUTENBERG EBOOK/i,
  ];
  const endMarkers = [
    /\*\*\* END OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i,
    /\*\*\*END OF THE PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i,
    /END OF THE PROJECT GUTENBERG EBOOK/i,
    /End of the Project Gutenberg/i,
  ];

  let result = text;

  for (const marker of startMarkers) {
    const match = result.match(marker);
    if (match && match.index !== undefined) {
      result = result.slice(match.index + match[0].length);
      break;
    }
  }

  for (const marker of endMarkers) {
    const match = result.match(marker);
    if (match && match.index !== undefined) {
      result = result.slice(0, match.index);
      break;
    }
  }

  return result;
}

// Clean text: remove excessive whitespace, normalize line breaks
export function cleanText(raw: string): string {
  let text = normalizeText(raw);
  text = removeGutenbergBoilerplate(text);

  // Normalize excessive blank lines (more than 2 → 2)
  text = text.replace(/\n{3,}/g, '\n\n');

  // Normalize horizontal whitespace within lines
  text = text.split('\n').map(line => line.replace(/[ \t]+/g, ' ').trim()).join('\n');

  // Remove leading/trailing whitespace
  text = text.trim();

  return text;
}

// Determine if a line looks like a chapter heading
function isChapterHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;

  // Must be reasonably short (not a paragraph)
  if (trimmed.length > 80) return false;

  // Common chapter patterns
  const patterns = [
    /^(chapter|chap\.?)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|\d+|[IVXLCDM]+)[\s\.:—-]*/i,
    /^(part|book|section|volume|act|scene)\s+(one|two|three|four|five|\d+|[IVXLCDM]+)[\s\.:—-]*/i,
    /^(prologue|epilogue|introduction|preface|foreword|afterword|appendix|conclusion|interlude)[\s\.:—-]*/i,
    /^[IVX]+\.\s+[A-Z]/,     // Roman numeral + period + capital
    /^chapter\s+\d+/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(trimmed)) return true;
  }

  // Short all-uppercase line that isn't just a single word of noise
  const upperPattern = /^[A-Z\s\d\.\:\-,'']+$/;
  if (upperPattern.test(trimmed) && trimmed.length >= 5 && trimmed.length <= 60) {
    const wordCount = trimmed.trim().split(/\s+/).length;
    // Avoid treating every short uppercase line as chapter (need at least 2 words or a clear keyword)
    if (wordCount >= 2) return true;
  }

  return false;
}

// Split text into chapters
export function splitIntoChapters(text: string): { title: string; text: string }[] {
  const lines = text.split('\n');
  const chapters: { title: string; text: string }[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];
  let foundFirstChapter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isChapterHeading(trimmed)) {
      // Save any accumulated text before this chapter
      if (foundFirstChapter && currentLines.join('\n').trim().length > 20) {
        chapters.push({ title: currentTitle, text: currentLines.join('\n').trim() });
      } else if (!foundFirstChapter && currentLines.join('\n').trim().length > 100) {
        // There's substantial text before first detected chapter — save as "Preface" or opening
        chapters.push({ title: 'Opening', text: currentLines.join('\n').trim() });
      }
      currentTitle = trimmed;
      currentLines = [];
      foundFirstChapter = true;
    } else {
      currentLines.push(line);
    }
  }

  // Save the final chapter
  if (currentLines.join('\n').trim().length > 0) {
    if (foundFirstChapter) {
      chapters.push({ title: currentTitle || 'Final Chapter', text: currentLines.join('\n').trim() });
    } else {
      // No chapters detected — entire book is one chapter
      chapters.push({ title: 'Full Book', text: (currentTitle ? currentTitle + '\n' : '') + currentLines.join('\n').trim() });
    }
  }

  // If no chapters were detected, return the whole text as one chapter
  if (chapters.length === 0) {
    return [{ title: 'Full Book', text: text.trim() }];
  }

  return chapters;
}

// Tokenize text into words, preserving punctuation
export function tokenizeWords(text: string): string[] {
  // Split by whitespace, preserve punctuation attached to words
  const tokens = text
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 0);
  return tokens;
}

// Detect paragraph ending (word followed by blank line)
export function isParagraphEnd(words: string[], index: number): boolean {
  // Simplified: check if the word ends a paragraph by looking at original text structure
  const word = words[index];
  if (!word) return false;

  // Check if word ends with sentence-ending punctuation
  return /[.!?]["']?$/.test(word.replace(/\s/g, ''));
}

// Get punctuation pause multiplier for a word
export function getPauseMult(word: string): number {
  const clean = word.trim();
  if (/[.!?]["']?$/.test(clean)) return 2.0;
  if (/[;:]$/.test(clean)) return 1.5;
  if (/[,]$/.test(clean)) return 1.3;
  return 1.0;
}

// Find the optimal recognition point (ORP) index in a word
export function getORPIndex(word: string): number {
  const len = word.replace(/[^a-zA-Z0-9]/g, '').length;
  if (len <= 1) return 0;
  if (len <= 5) return 1;
  if (len <= 9) return 2;
  if (len <= 13) return 3;
  return Math.floor(len / 4);
}

// Estimate reading time in minutes
export function estimateReadingTime(wordCount: number, wpm = 250): number {
  return Math.ceil(wordCount / wpm);
}

// Full processing pipeline
export interface ProcessedBook {
  cleanedText: string;
  chapters: { title: string; text: string; startWordIndex: number; endWordIndex: number }[];
  words: string[];
  totalWords: number;
  estimatedReadingMinutes: number;
}

export async function processBookText(rawText: string): Promise<ProcessedBook> {
  // Process in chunks to avoid blocking the main thread
  await new Promise(resolve => setTimeout(resolve, 0));

  const cleanedText = cleanText(rawText);

  await new Promise(resolve => setTimeout(resolve, 0));

  const rawChapters = splitIntoChapters(cleanedText);

  await new Promise(resolve => setTimeout(resolve, 0));

  // Build global word array across all chapters
  const words: string[] = [];
  const chapters: { title: string; text: string; startWordIndex: number; endWordIndex: number }[] = [];

  for (const ch of rawChapters) {
    const startWordIndex = words.length;
    const chWords = tokenizeWords(ch.text);
    words.push(...chWords);
    chapters.push({
      ...ch,
      startWordIndex,
      endWordIndex: words.length - 1,
    });
    // Yield to prevent UI freeze on large books
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  const totalWords = words.length;
  const estimatedReadingMinutes = estimateReadingTime(totalWords);

  return { cleanedText, chapters, words, totalWords, estimatedReadingMinutes };
}
