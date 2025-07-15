/**
 * Centralized salesperson thumbnail mapping
 * This ensures consistency across all components
 */

// Thumbnail mapping for all salespeople
export const SALESPERSON_THUMBNAILS: Record<string, string> = {
  'Christian Ruddy': '/christian-ruddy.jpg',
  'Luigi': '/luigi.jpg',
  'Giovanni Femia': '/luigi.jpg', // Giovanni uses the same image as Luigi
  'Giovanni': '/luigi.jpg', // Alternative spelling
  'Michael Squires': '/michael-squires.jpg',
  'Jared Niedhardt': '/jared-gpt-2.png',
  'Jared Neidhardt': '/jared-gpt-2.png', // Alternative spelling
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
  // Debug: Log the name being looked up
  console.log('[Thumbnail Lookup] Looking for:', name, 'Display name:', getDisplayName(name));
  
  // Try exact match first, then try display name format
  const thumbnail = SALESPERSON_THUMBNAILS[name] || SALESPERSON_THUMBNAILS[getDisplayName(name)] || null;
  
  if (!thumbnail && name) {
    console.log('[Thumbnail Missing] No thumbnail found for:', name);
  }
  
  return thumbnail;
};