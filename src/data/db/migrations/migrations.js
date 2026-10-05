import journal from './meta/_journal.json';
import m0000 from './0000_init.sql';
import m0001 from './0001_words_fold_index.sql';
import m0002 from './0002_words_fts.sql';

  export default {
    journal,
    migrations: {
      m0000,
m0001,
m0002
    }
  }
  