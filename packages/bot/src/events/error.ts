import { logger } from '../utils/logger';

export default {
  name: 'error',
  async execute(error: Error) {
    logger.error('Discord client error:', error);
  },
};
