import knexLib from 'knex';
import knexfile from '../knexfile.js';

const env = process.env.NODE_ENV || 'development';
const config = knexfile[env] || knexfile.development;

const knex = knexLib(config);

export default knex;
