/**
 * Centralized salesperson thumbnail mapping
 * This ensures consistency across all components
 */

// Thumbnail mapping for all salespeople
export const SALESPERSON_THUMBNAILS: Record<string, string> = {
  'Christian Ruddy': '/christian-ruddy.jpg',
  'Luigi': '/luigi.jpg',
  'Giovanni Femia': '/luigi.jpg', // Giovanni uses the same image as Luigi
  'Michael Squires': '/michael-squires.jpg',
  'Jared Niedhardt': '/jared-gpt.png',
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
  // Try exact match first, then try display name format
  return SALESPERSON_THUMBNAILS[name] || SALESPERSON_THUMBNAILS[getDisplayName(name)] || null;
};