import { searchTracks } from '../../server/controllers/spotifyController.js';
import { protectedHandler } from '../../server/security.js';
export default protectedHandler(searchTracks);
