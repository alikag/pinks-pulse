/**
 * Centralized salesperson thumbnail mapping
 * This ensures consistency across all components
 */

// Thumbnail mapping for all salespeople
export const SALESPERSON_THUMBNAILS: Record<string, string> = {
  // Christian Ruddy variations
  'Christian Ruddy': '/christian-ruddy.jpg',
  'christian ruddy': '/christian-ruddy.jpg',
  'CHRISTIAN RUDDY': '/christian-ruddy.jpg',
  
  // Luigi/Giovanni variations
  'Luigi': '/luigi.jpg',
  'luigi': '/luigi.jpg',
  'LUIGI': '/luigi.jpg',
  'Giovanni Femia': '/luigi.jpg',
  'giovanni femia': '/luigi.jpg',
  'GIOVANNI FEMIA': '/luigi.jpg',
  'Giovanni': '/luigi.jpg',
  'giovanni': '/luigi.jpg',
  
  // Michael Squires variations
  'Michael Squires': '/michael-squires.jpg',
  'michael squires': '/michael-squires.jpg',
  'MICHAEL SQUIRES': '/michael-squires.jpg',
  
  // Jared variations (both spellings)
  'Jared Niedhardt': '/jared-gpt-2.png',
  'jared niedhardt': '/jared-gpt-2.png',
  'JARED NIEDHARDT': '/jared-gpt-2.png',
  'Jared Neidhardt': '/jared-gpt-2.png',
  'jared neidhardt': '/jared-gpt-2.png',
  'JARED NEIDHARDT': '/jared-gpt-2.png',
  
  // Add more mappings as images become available
};

// Helper function to get display name for salesperson (proper case)
export const getDisplayName = (name: string): string => {
  if (!name) return 'Unknown';
  // Convert to proper case: "christian ruddy" -> "Christian Ruddy"
  return name.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
};

// Helper function to get salesperson thumbnail
export const getSalespersonThumbnail = (name: string): string | null => {
  if (!name) return null;
  
  // Normalize the name (trim whitespace)
  const trimmedName = name.trim();
  
  // Try multiple approaches to find a match
  const thumbnail = SALESPERSON_THUMBNAILS[trimmedName] || 
                   SALESPERSON_THUMBNAILS[getDisplayName(trimmedName)] ||
                   SALESPERSON_THUMBNAILS[trimmedName.toLowerCase()] ||
                   SALESPERSON_THUMBNAILS[trimmedName.toUpperCase()] ||
                   null;
  
  // Log only when thumbnail is not found (for debugging)
  if (!thumbnail && trimmedName) {
    console.warn(`[Thumbnail Missing] No thumbnail found for: "${trimmedName}"`);
  }
  
  return thumbnail;
};